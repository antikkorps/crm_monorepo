import Fuse from 'fuse.js'
import { MedicalInstitution } from '../models/MedicalInstitution'
import { DigiformaCompany } from '../models/DigiformaCompany'
import { ContactPerson } from '../models/ContactPerson'
import { logger } from '../utils/logger'

/**
 * Match result with score and criteria
 */
export interface MatchResult {
  institution: MedicalInstitution
  score: number // 0-100 (100 = perfect match)
  matchCriteria: string // accountingNumber, siret, email, fuzzy_name_city, fuzzy_name_zipcode
  matchType: 'auto' | 'fuzzy'
}

/**
 * DigiformaMatchingService - Intelligent matching between Digiforma companies and CRM institutions
 *
 * Priority order (highest to lowest confidence):
 * 1. Accounting number (100% - shared across all systems)
 * 2. SIRET (100% - legal unique identifier)
 * 3. Email (100% - contact email match)
 * 4. Fuzzy name + city (70-99% - calculated similarity)
 * 5. Fuzzy name + zipcode (70-99% - calculated similarity)
 */
export class DigiformaMatchingService {
  private readonly FUZZY_THRESHOLD = 85 // Minimum score for auto-match (85%)
  private readonly MIN_SCORE = 70 // Minimum score to consider a match (70%)

  /**
   * Find best matching institution for a Digiforma company
   * Returns null if no good match found (score < MIN_SCORE)
   */
  async findBestMatch(digiformaCompany: DigiformaCompany): Promise<MatchResult | null> {
    // Priority 1: Match by accounting number
    if (digiformaCompany.metadata?.accountingNumber) {
      const match = await this.matchByAccountingNumber(
        digiformaCompany.metadata.accountingNumber as string
      )
      if (match) {
        logger.info('Match found by accounting number', {
          digiformaCompanyId: digiformaCompany.id,
          institutionId: match.id,
          accountingNumber: digiformaCompany.metadata.accountingNumber
        })
        return {
          institution: match,
          score: 100,
          matchCriteria: 'accountingNumber',
          matchType: 'auto'
        }
      }
    }

    // Priority 2: Match by SIRET
    if (digiformaCompany.siret) {
      const match = await this.matchBySiret(digiformaCompany.siret)
      if (match) {
        logger.info('Match found by SIRET', {
          digiformaCompanyId: digiformaCompany.id,
          institutionId: match.id,
          siret: digiformaCompany.siret
        })
        return {
          institution: match,
          score: 100,
          matchCriteria: 'siret',
          matchType: 'auto'
        }
      }
    }

    // Priority 3: Match by email (contact email)
    if (digiformaCompany.email) {
      const match = await this.matchByEmail(digiformaCompany.email)
      if (match) {
        logger.info('Match found by email', {
          digiformaCompanyId: digiformaCompany.id,
          institutionId: match.id,
          email: digiformaCompany.email
        })
        return {
          institution: match,
          score: 100,
          matchCriteria: 'email',
          matchType: 'auto'
        }
      }
    }

    // Priority 4 & 5: Fuzzy matching by name + location
    const fuzzyMatch = await this.fuzzyMatchByNameAndLocation(digiformaCompany)
    if (fuzzyMatch && fuzzyMatch.score >= this.MIN_SCORE) {
      logger.info('Match found by fuzzy search', {
        digiformaCompanyId: digiformaCompany.id,
        institutionId: fuzzyMatch.institution.id,
        score: fuzzyMatch.score,
        criteria: fuzzyMatch.matchCriteria
      })
      return fuzzyMatch
    }

    logger.info('No match found for Digiforma company', {
      digiformaCompanyId: digiformaCompany.id,
      name: digiformaCompany.name
    })
    return null
  }

  /**
   * Get multiple match suggestions for manual reconciliation
   * Returns top N matches with scores
   */
  async getSuggestedMatches(
    digiformaCompany: DigiformaCompany,
    limit: number = 5
  ): Promise<MatchResult[]> {
    const suggestions: MatchResult[] = []

    // Check exact matches first
    if (digiformaCompany.metadata?.accountingNumber) {
      const match = await this.matchByAccountingNumber(
        digiformaCompany.metadata.accountingNumber as string
      )
      if (match) {
        suggestions.push({
          institution: match,
          score: 100,
          matchCriteria: 'accountingNumber',
          matchType: 'auto'
        })
      }
    }

    if (digiformaCompany.siret) {
      const match = await this.matchBySiret(digiformaCompany.siret)
      if (match && !suggestions.find(s => s.institution.id === match.id)) {
        suggestions.push({
          institution: match,
          score: 100,
          matchCriteria: 'siret',
          matchType: 'auto'
        })
      }
    }

    if (digiformaCompany.email) {
      const match = await this.matchByEmail(digiformaCompany.email)
      if (match && !suggestions.find(s => s.institution.id === match.id)) {
        suggestions.push({
          institution: match,
          score: 100,
          matchCriteria: 'email',
          matchType: 'auto'
        })
      }
    }

    // Add fuzzy matches
    const fuzzyMatches = await this.fuzzyMatchMultiple(digiformaCompany, limit - suggestions.length)
    for (const fuzzyMatch of fuzzyMatches) {
      if (!suggestions.find(s => s.institution.id === fuzzyMatch.institution.id)) {
        suggestions.push(fuzzyMatch)
      }
    }

    // Sort by score descending and limit
    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  /**
   * Match by accounting number (exact match)
   */
  private async matchByAccountingNumber(accountingNumber: string): Promise<MedicalInstitution | null> {
    return await MedicalInstitution.findOne({
      where: { accountingNumber: accountingNumber.trim() }
    })
  }

  /**
   * Match by SIRET (exact match)
   */
  private async matchBySiret(siret: string): Promise<MedicalInstitution | null> {
    // Search in externalData.digiforma.siret or direct field if we add it
    const institutions = await MedicalInstitution.findAll()
    return institutions.find(inst => {
      const digiformaSiret = inst.externalData?.digiforma?.siret
      return digiformaSiret && digiformaSiret === siret.trim()
    }) || null
  }

  /**
   * Match by email (contact email)
   */
  private async matchByEmail(email: string): Promise<MedicalInstitution | null> {
    const contacts = await ContactPerson.findAll({
      where: { email: email.trim().toLowerCase() },
      include: [{ model: MedicalInstitution, as: 'institution' }]
    })

    return contacts.length > 0 ? (contacts[0].institution as MedicalInstitution) : null
  }

  /**
   * Fuzzy match by name and location (city or zipcode)
   * Returns best match with score
   */
  private async fuzzyMatchByNameAndLocation(
    digiformaCompany: DigiformaCompany
  ): Promise<MatchResult | null> {
    const matches = await this.fuzzyMatchMultiple(digiformaCompany, 1)
    return matches.length > 0 ? matches[0] : null
  }

  /**
   * Fuzzy match returning multiple results
   */
  private async fuzzyMatchMultiple(
    digiformaCompany: DigiformaCompany,
    limit: number
  ): Promise<MatchResult[]> {
    // Get all institutions
    const institutions = await MedicalInstitution.findAll()

    if (institutions.length === 0) {
      return []
    }

    // Normalize Digiforma company data
    const normalizedDigiformaName = this.normalizeName(digiformaCompany.name)
    const digiformaCity = this.normalizeCity(digiformaCompany.address?.city || '')
    const digiformaZipCode = (digiformaCompany.metadata?.cityCode as string) || digiformaCompany.address?.zipCode || ''

    // Create searchable data for institutions
    const searchableInstitutions = institutions.map(inst => ({
      institution: inst,
      searchName: this.normalizeName(inst.name),
      searchCity: this.normalizeCity(inst.address?.city || ''),
      searchZipCode: inst.address?.zipCode || '',
      // Combine name + city for fuzzy search
      nameCity: `${this.normalizeName(inst.name)} ${this.normalizeCity(inst.address?.city || '')}`,
      // Combine name + zipcode for fuzzy search
      nameZipCode: `${this.normalizeName(inst.name)} ${inst.address?.zipCode || ''}`
    }))

    // Configure Fuse.js for name + city search
    const fuseCityOptions = {
      keys: ['nameCity'],
      threshold: 0.3, // Lower = more strict (0.3 means 70% similarity required)
      includeScore: true,
      ignoreLocation: true
    }

    const fuseCitySearch = new Fuse(searchableInstitutions, fuseCityOptions)
    const cityQuery = `${normalizedDigiformaName} ${digiformaCity}`
    const cityResults = fuseCitySearch.search(cityQuery)

    // Configure Fuse.js for name + zipcode search
    const fuseZipOptions = {
      keys: ['nameZipCode'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true
    }

    const fuseZipSearch = new Fuse(searchableInstitutions, fuseZipOptions)
    const zipQuery = `${normalizedDigiformaName} ${digiformaZipCode}`
    const zipResults = fuseZipSearch.search(zipQuery)

    // Combine and deduplicate results
    const combinedResults = new Map<string, MatchResult>()

    // Process city matches
    for (const result of cityResults) {
      const institution = result.item.institution
      const fuseScore = result.score || 0
      const normalizedScore = Math.round((1 - fuseScore) * 100) // Convert Fuse score to 0-100

      if (normalizedScore >= this.MIN_SCORE) {
        combinedResults.set(institution.id, {
          institution,
          score: normalizedScore,
          matchCriteria: 'fuzzy_name_city',
          matchType: normalizedScore >= this.FUZZY_THRESHOLD ? 'auto' : 'fuzzy'
        })
      }
    }

    // Process zipcode matches (prefer higher scores)
    for (const result of zipResults) {
      const institution = result.item.institution
      const fuseScore = result.score || 0
      const normalizedScore = Math.round((1 - fuseScore) * 100)

      if (normalizedScore >= this.MIN_SCORE) {
        const existing = combinedResults.get(institution.id)
        if (!existing || normalizedScore > existing.score) {
          combinedResults.set(institution.id, {
            institution,
            score: normalizedScore,
            matchCriteria: 'fuzzy_name_zipcode',
            matchType: normalizedScore >= this.FUZZY_THRESHOLD ? 'auto' : 'fuzzy'
          })
        }
      }
    }

    // Sort by score and limit
    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Normalize name for comparison
   * - Remove accents
   * - Lowercase
   * - Remove apostrophes (creates compound words like "lhopital")
   * - Replace hyphens with spaces
   * - Remove common words (Clinique, Centre, Hôpital, etc.)
   * - Remove French articles and prepositions
   * - Remove punctuation
   * - Normalize abbreviations
   */
  private normalizeName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .toLowerCase()
      .replace(/'/g, '') // Remove apostrophes (creates compound words like "lhopital")
      .replace(/-/g, ' ') // Replace hyphens with spaces
      .replace(/\b(clinique|centre|hopital|hospital|hospitalier|universitaire|chu|ch|cabinet|maison|sainte|saint|ste|st)\b/gi, '')
      .replace(/\b(de|du|la|le|les|des|d)\b/gi, '') // Remove French articles and prepositions (not 'l' alone)
      .replace(/[^\w\s]/g, '') // Remove remaining punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
  }

  /**
   * Normalize city name
   * Cities are normalized without spaces for better matching
   */
  private normalizeCity(city: string): string {
    return city
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/'/g, '') // Remove apostrophes
      .replace(/-/g, ' ') // Replace hyphens with spaces
      .replace(/\b(sur|sous|les|en|de|du|la|le)\b/gi, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '') // Remove all spaces for cities
      .trim()
  }
}
