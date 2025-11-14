/**
 * CSV Matching Service
 *
 * Provides multi-criteria matching for CSV imports with confidence scores.
 *
 * Matching Strategy (Priority order):
 * 1. accountingNumber (exact match) → 100% confidence
 * 2. name (exact) + address (exact) → 95% confidence
 * 3. name (fuzzy) + city (exact) → 60-85% confidence (based on similarity)
 */

import { compareTwoStrings } from 'string-similarity'
import { MedicalInstitution } from '../models'
import { logger } from '../utils/logger'
import { Op, Sequelize } from 'sequelize'

/**
 * Match types by priority
 */
export enum MatchType {
  ACCOUNTING_NUMBER = 'accountingNumber', // Priority 1: Exact accounting number match
  EXACT_NAME_ADDRESS = 'exactNameAddress', // Priority 2: Exact name + full address
  FUZZY_NAME_CITY = 'fuzzyNameCity',      // Priority 3: Fuzzy name + exact city
  NO_MATCH = 'noMatch'                    // No match found
}

/**
 * Match result with confidence score and details
 */
export interface MatchResult {
  matched: boolean
  matchType: MatchType
  confidence: number // 0-100
  institution?: MedicalInstitution
  details?: {
    nameSimilarity?: number
    addressMatch?: boolean
    cityMatch?: boolean
    reason?: string
  }
  suggestions?: MedicalInstitution[] // Alternative matches (for manual review)
}

/**
 * Input data for matching
 */
export interface MatchInput {
  name: string
  accountingNumber?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
}

export class CsvMatchingService {
  // Thresholds for fuzzy matching
  private static readonly FUZZY_MATCH_THRESHOLD = 0.80 // 80% similarity minimum
  private static readonly FUZZY_SUGGESTIONS_THRESHOLD = 0.60 // 60% for suggestions

  /**
   * Find best match for CSV row data
   *
   * @param input - Input data from CSV
   * @returns MatchResult with confidence score and matched institution
   */
  static async findBestMatch(input: MatchInput): Promise<MatchResult> {
    logger.debug('CsvMatching: Finding best match', {
      name: input.name,
      accountingNumber: input.accountingNumber,
      city: input.address?.city
    })

    // Priority 1: Accounting Number Match (100% confidence)
    if (input.accountingNumber) {
      const accountingMatch = await this.matchByAccountingNumber(input.accountingNumber)
      if (accountingMatch) {
        logger.info('CsvMatching: Found exact match by accountingNumber', {
          accountingNumber: input.accountingNumber,
          institutionId: accountingMatch.id,
          institutionName: accountingMatch.name
        })

        return {
          matched: true,
          matchType: MatchType.ACCOUNTING_NUMBER,
          confidence: 100,
          institution: accountingMatch,
          details: {
            reason: 'Exact accounting number match'
          }
        }
      }
    }

    // Priority 2: Exact Name + Full Address Match (95% confidence)
    if (input.address?.street && input.address?.city && input.address?.zipCode) {
      const exactMatch = await this.matchByExactNameAndAddress(
        input.name,
        input.address.street,
        input.address.city,
        input.address.zipCode
      )

      if (exactMatch) {
        logger.info('CsvMatching: Found exact match by name + address', {
          name: input.name,
          city: input.address.city,
          institutionId: exactMatch.id
        })

        return {
          matched: true,
          matchType: MatchType.EXACT_NAME_ADDRESS,
          confidence: 95,
          institution: exactMatch,
          details: {
            addressMatch: true,
            reason: 'Exact name and address match'
          }
        }
      }
    }

    // Priority 3: Fuzzy Name + Exact City Match (60-85% confidence)
    if (input.address?.city) {
      const fuzzyMatch = await this.matchByFuzzyNameAndCity(
        input.name,
        input.address.city
      )

      if (fuzzyMatch.matched) {
        logger.info('CsvMatching: Found fuzzy match by name + city', {
          inputName: input.name,
          matchedName: fuzzyMatch.institution?.name,
          similarity: fuzzyMatch.confidence,
          city: input.address.city
        })

        return fuzzyMatch
      }
    }

    // No match found
    logger.debug('CsvMatching: No match found', {
      name: input.name,
      city: input.address?.city
    })

    return {
      matched: false,
      matchType: MatchType.NO_MATCH,
      confidence: 0,
      details: {
        reason: 'No matching institution found'
      }
    }
  }

  /**
   * Priority 1: Match by accountingNumber (exact)
   */
  private static async matchByAccountingNumber(
    accountingNumber: string
  ): Promise<MedicalInstitution | null> {
    const normalized = accountingNumber.trim().toUpperCase()

    const institution = await MedicalInstitution.findOne({
      where: {
        accountingNumber: {
          [Op.iLike]: normalized // Case-insensitive match
        }
      }
    })

    return institution
  }

  /**
   * Priority 2: Match by exact name + full address
   */
  private static async matchByExactNameAndAddress(
    name: string,
    street: string,
    city: string,
    zipCode: string
  ): Promise<MedicalInstitution | null> {
    const normalizedName = this.normalizeName(name)
    const normalizedStreet = street.trim().toLowerCase()
    const normalizedCity = city.trim().toLowerCase()
    const normalizedZip = zipCode.trim()

    const institutions = await MedicalInstitution.findAll({
      where: {
        // Sequelize doesn't have direct JSON field search in WHERE for address
        // We'll fetch by name and filter in-memory for address
        name: {
          [Op.iLike]: normalizedName
        }
      }
    })

    // Filter by address match
    for (const institution of institutions) {
      const addr = institution.address as any
      if (!addr) continue

      const instStreet = (addr.street || '').trim().toLowerCase()
      const instCity = (addr.city || '').trim().toLowerCase()
      const instZip = (addr.zipCode || '').trim()

      if (
        instStreet === normalizedStreet &&
        instCity === normalizedCity &&
        instZip === normalizedZip
      ) {
        return institution
      }
    }

    return null
  }

  /**
   * Priority 3: Match by fuzzy name + exact city (with confidence scoring)
   */
  private static async matchByFuzzyNameAndCity(
    name: string,
    city: string
  ): Promise<MatchResult> {
    const normalizedInputName = this.normalizeName(name)
    const normalizedCity = city.trim().toLowerCase()

    // Find all institutions in the same city using SQL JSON query for better performance
    const institutions = await MedicalInstitution.findAll({
      where: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.fn('TRIM', Sequelize.literal("address->>'city'"))),
        normalizedCity
      ),
      limit: 500 // Reasonable limit after city filtering
    })

    // Calculate similarity scores for all institutions in the city
    const candidates: Array<{
      institution: MedicalInstitution
      similarity: number
    }> = []

    for (const institution of institutions) {
      // Calculate name similarity
      const instName = this.normalizeName(institution.name)
      const similarity = compareTwoStrings(normalizedInputName, instName)

      candidates.push({
        institution,
        similarity
      })
    }

    // Sort by similarity (highest first)
    candidates.sort((a, b) => b.similarity - a.similarity)

    // Best match
    const bestMatch = candidates[0]

    if (bestMatch && bestMatch.similarity >= this.FUZZY_MATCH_THRESHOLD) {
      // High confidence match (80%+)
      const confidence = Math.round(bestMatch.similarity * 100)

      return {
        matched: true,
        matchType: MatchType.FUZZY_NAME_CITY,
        confidence: Math.min(confidence, 85), // Cap at 85% for fuzzy matches
        institution: bestMatch.institution,
        details: {
          nameSimilarity: bestMatch.similarity,
          cityMatch: true,
          reason: `Fuzzy name match (${Math.round(bestMatch.similarity * 100)}% similarity) in same city`
        },
        // Include other high-scoring candidates as suggestions
        suggestions: candidates
          .slice(1, 4) // Top 3 alternatives
          .filter(c => c.similarity >= this.FUZZY_SUGGESTIONS_THRESHOLD)
          .map(c => c.institution)
      }
    }

    // No confident match, but provide suggestions
    const suggestions = candidates
      .filter(c => c.similarity >= this.FUZZY_SUGGESTIONS_THRESHOLD)
      .slice(0, 3)
      .map(c => c.institution)

    return {
      matched: false,
      matchType: MatchType.NO_MATCH,
      confidence: 0,
      details: {
        nameSimilarity: bestMatch?.similarity,
        cityMatch: true,
        reason: suggestions.length > 0
          ? `No confident match, but ${suggestions.length} potential candidates found`
          : 'No similar institutions found in same city'
      },
      suggestions
    }
  }

  /**
   * Normalize institution name for comparison
   * - Trim whitespace
   * - Lowercase
   * - Remove common prefixes/suffixes (CHU, Clinique, Hôpital, etc.)
   * - Remove special characters
   */
  private static normalizeName(name: string): string {
    let normalized = name.trim().toLowerCase()

    // Remove common French medical prefixes/suffixes
    const prefixes = ['chu ', 'chr ', 'ch ', 'clinique ', 'hôpital ', 'hopital ', 'centre ', 'établissement ']
    const suffixes = [' chu', ' chr', ' ch', ' clinic', ' hospital', ' centre', ' center']

    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length)
      }
    }

    for (const suffix of suffixes) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.substring(0, normalized.length - suffix.length)
      }
    }

    // Remove punctuation/symbols (keep all Unicode letters including accents, numbers, spaces)
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '')

    // Normalize multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim()

    return normalized
  }

  /**
   * Batch matching for multiple CSV rows (optimized)
   *
   * @param inputs - Array of CSV row data
   * @returns Array of MatchResults
   */
  static async findBatchMatches(inputs: MatchInput[]): Promise<MatchResult[]> {
    logger.info('CsvMatching: Starting batch matching', {
      totalRows: inputs.length
    })

    const results: MatchResult[] = []

    for (const input of inputs) {
      const result = await this.findBestMatch(input)
      results.push(result)
    }

    // Summary logging
    const matched = results.filter(r => r.matched).length
    const byType = {
      accountingNumber: results.filter(r => r.matchType === MatchType.ACCOUNTING_NUMBER).length,
      exactNameAddress: results.filter(r => r.matchType === MatchType.EXACT_NAME_ADDRESS).length,
      fuzzyNameCity: results.filter(r => r.matchType === MatchType.FUZZY_NAME_CITY).length,
      noMatch: results.filter(r => r.matchType === MatchType.NO_MATCH).length
    }

    logger.info('CsvMatching: Batch matching completed', {
      totalRows: inputs.length,
      matched,
      unmatchedRows: inputs.length - matched,
      matchTypes: byType
    })

    return results
  }
}
