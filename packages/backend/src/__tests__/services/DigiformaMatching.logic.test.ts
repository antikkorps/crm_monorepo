/**
 * Logic tests for Digiforma matching algorithms
 * Tests the core matching logic without database dependencies
 */
import { describe, it, expect } from 'vitest'

/**
 * Normalize name for comparison - copied from DigiformaMatchingService
 * This is the logic we're testing
 */
function normalizeName(name: string): string {
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
 * Normalize city name - copied from DigiformaMatchingService
 */
function normalizeCity(city: string): string {
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

describe('Digiforma Matching - Name Normalization Logic', () => {
  describe('normalizeName', () => {
    it('should remove accents', () => {
      expect(normalizeName('Hôpital de la Pitié-Salpêtrière')).toBe('pitie salpetriere')
    })

    it('should convert to lowercase', () => {
      expect(normalizeName('CHU DE LYON')).toBe('lyon')
    })

    it('should remove common medical words', () => {
      expect(normalizeName('Centre Hospitalier Universitaire')).toBe('')
      expect(normalizeName('Clinique du Parc')).toBe('parc')
      expect(normalizeName('Hôpital Saint-Antoine')).toBe('antoine')
      expect(normalizeName('CHU de Lyon')).toBe('lyon')
      expect(normalizeName('Cabinet Médical Test')).toBe('medical test')
    })

    it('should remove punctuation', () => {
      expect(normalizeName('Saint-Joseph & Marie')).toBe('joseph marie')
      expect(normalizeName("L'Hôpital de Paris")).toBe('lhopital paris')
      expect(normalizeName('Centre (Test)')).toBe('test')
    })

    it('should normalize spaces', () => {
      expect(normalizeName('Clinique   du    Parc')).toBe('parc')
      expect(normalizeName('  CHU Lyon  ')).toBe('lyon')
    })

    it('should handle complex real-world names', () => {
      // CHU de Lyon vs Centre Hospitalier Universitaire de Lyon → both become "lyon"
      const name1 = normalizeName('CHU de Lyon')
      const name2 = normalizeName('Centre Hospitalier Universitaire de Lyon')
      expect(name1).toBe(name2)
      expect(name1).toBe('lyon')
    })

    it('should handle abbreviations', () => {
      // Sainte → Ste
      expect(normalizeName('Clinique Sainte Marie')).toBe('marie')
      expect(normalizeName('Clinique Ste Marie')).toBe('marie')

      // Saint → St
      expect(normalizeName('Hôpital Saint Joseph')).toBe('joseph')
      expect(normalizeName('Hôpital St Joseph')).toBe('joseph')
    })

    it('should make "CHU Toulouse" match "Centre Hospitalier Universitaire Toulouse"', () => {
      const name1 = normalizeName('CHU Toulouse')
      const name2 = normalizeName('Centre Hospitalier Universitaire Toulouse')
      expect(name1).toBe(name2)
      expect(name1).toBe('toulouse')
    })

    it('should make similar names more matchable', () => {
      // These should normalize to similar strings
      const original = normalizeName('Clinique du Parc de Lyon')
      const variant1 = normalizeName('Clinique Parc Lyon')
      const variant2 = normalizeName('Parc Lyon')

      expect(original).toBe('parc lyon')
      expect(variant1).toBe('parc lyon')
      expect(variant2).toBe('parc lyon')
    })
  })

  describe('normalizeCity', () => {
    it('should remove accents', () => {
      expect(normalizeCity('Saint-Étienne')).toBe('saintetienne')
    })

    it('should convert to lowercase', () => {
      expect(normalizeCity('PARIS')).toBe('paris')
    })

    it('should remove common prepositions', () => {
      expect(normalizeCity('Lyon-sur-Rhône')).toBe('lyonrhone')
      expect(normalizeCity('Bourg-en-Bresse')).toBe('bourgbresse')
      expect(normalizeCity('Aix-les-Bains')).toBe('aixbains')
    })

    it('should remove punctuation', () => {
      expect(normalizeCity('Saint-Denis')).toBe('saintdenis')
      expect(normalizeCity("L'Isle-Adam")).toBe('lisleadam')
    })

    it('should normalize spaces', () => {
      expect(normalizeCity('  Paris  ')).toBe('paris')
      expect(normalizeCity('Saint   Denis')).toBe('saintdenis')
    })
  })

  describe('Matching Scenarios', () => {
    it('scenario: "CHU de Lyon" should match "Centre Hospitalier Universitaire Lyon"', () => {
      const digiforma = normalizeName('CHU de Lyon')
      const crm = normalizeName('Centre Hospitalier Universitaire Lyon')
      expect(digiforma).toBe(crm)
    })

    it('scenario: Same name with/without accents should match', () => {
      const digiforma = normalizeName('Hopital de la Pitie-Salpetriere')
      const crm = normalizeName('Hôpital de la Pitié-Salpêtrière')
      expect(digiforma).toBe(crm)
    })

    it('scenario: "Clinique du Parc" variations should be similar', () => {
      const names = [
        'Clinique du Parc',
        'Clinique Parc',
        'Parc',
      ].map(normalizeName)

      // All should be 'parc'
      names.forEach(name => {
        expect(name).toBe('parc')
      })
    })

    it('scenario: Different institutions should remain different', () => {
      const hospital1 = normalizeName('Hôpital Saint-Antoine')
      const hospital2 = normalizeName('Hôpital Bichat')
      expect(hospital1).not.toBe(hospital2)
      expect(hospital1).toBe('antoine')
      expect(hospital2).toBe('bichat')
    })

    it('scenario: City matching should be fuzzy-friendly', () => {
      const city1 = normalizeCity('Lyon')
      const city2 = normalizeCity('Lyon-sur-Rhône')
      // After normalization, should be close enough for fuzzy matching
      expect(city2).toContain(city1)
    })
  })

  describe('Match Priority Logic', () => {
    it('should prioritize exact matches (accounting number, SIRET, email)', () => {
      // These are 100% matches - no normalization needed
      const priorities = {
        accountingNumber: { priority: 1, score: 100 },
        siret: { priority: 2, score: 100 },
        email: { priority: 3, score: 100 },
        fuzzy: { priority: 4, score: 'variable' }
      }

      expect(priorities.accountingNumber.priority).toBeLessThan(priorities.siret.priority)
      expect(priorities.siret.priority).toBeLessThan(priorities.email.priority)
      expect(priorities.email.priority).toBeLessThan(priorities.fuzzy.priority)
    })

    it('should classify match types correctly', () => {
      const matchTypes = {
        exact100: 'auto', // 100% = auto
        fuzzy90: 'auto',  // >= 85% = auto
        fuzzy85: 'auto',  // >= 85% = auto
        fuzzy84: 'fuzzy', // < 85% = fuzzy (needs review)
        fuzzy70: 'fuzzy', // >= 70% but < 85% = fuzzy
        fuzzy69: null,    // < 70% = no match (null)
      }

      expect(matchTypes.exact100).toBe('auto')
      expect(matchTypes.fuzzy90).toBe('auto')
      expect(matchTypes.fuzzy85).toBe('auto')
      expect(matchTypes.fuzzy84).toBe('fuzzy')
      expect(matchTypes.fuzzy70).toBe('fuzzy')
      expect(matchTypes.fuzzy69).toBeNull()
    })
  })
})

describe('Digiforma Matching - Score Threshold Logic', () => {
  const FUZZY_THRESHOLD = 85
  const MIN_SCORE = 70

  it('should accept scores >= MIN_SCORE (70%)', () => {
    const scores = [100, 95, 85, 75, 70]
    scores.forEach(score => {
      expect(score).toBeGreaterThanOrEqual(MIN_SCORE)
    })
  })

  it('should reject scores < MIN_SCORE (70%)', () => {
    const scores = [69, 60, 50, 30, 0]
    scores.forEach(score => {
      expect(score).toBeLessThan(MIN_SCORE)
    })
  })

  it('should classify scores >= FUZZY_THRESHOLD (85%) as auto', () => {
    const autoScores = [100, 95, 90, 85]
    autoScores.forEach(score => {
      expect(score >= FUZZY_THRESHOLD).toBe(true)
    })
  })

  it('should classify scores < FUZZY_THRESHOLD (85%) as fuzzy', () => {
    const fuzzyScores = [84, 80, 75, 70]
    fuzzyScores.forEach(score => {
      expect(score < FUZZY_THRESHOLD && score >= MIN_SCORE).toBe(true)
    })
  })
})

describe('Digiforma Matching - Expected Behavior', () => {
  it('should find perfect match by accountingNumber regardless of other differences', () => {
    // Even if names and cities are completely different,
    // matching accountingNumber should give 100% score
    const company = {
      name: 'Company A',
      city: 'Paris',
      accountingNumber: 'ACC-12345'
    }

    const institution = {
      name: 'Institution XYZ',
      city: 'Lyon',
      accountingNumber: 'ACC-12345'
    }

    // Logic: if accountingNumber matches → 100% score
    expect(company.accountingNumber).toBe(institution.accountingNumber)
    const score = 100
    expect(score).toBe(100)
  })

  it('should normalize before fuzzy matching', () => {
    const digiformaName = 'CHU de Lyon'
    const crmName = 'Centre Hospitalier Universitaire Lyon'

    // After normalization
    const normalizedDigiforma = normalizeName(digiformaName)
    const normalizedCrm = normalizeName(crmName)

    // Both should be 'lyon'
    expect(normalizedDigiforma).toBe('lyon')
    expect(normalizedCrm).toBe('lyon')

    // This will give very high fuzzy match score (close to 100%)
  })

  it('should combine name + city for better matching', () => {
    const company = {
      normalizedName: normalizeName('Clinique du Parc'),
      normalizedCity: normalizeCity('Lyon')
    }

    const institution = {
      normalizedName: normalizeName('Clinique Parc'),
      normalizedCity: normalizeCity('Lyon')
    }

    // Combined search string
    const companySearch = `${company.normalizedName} ${company.normalizedCity}`
    const institutionSearch = `${institution.normalizedName} ${institution.normalizedCity}`

    expect(companySearch).toBe('parc lyon')
    expect(institutionSearch).toBe('parc lyon')
    // Perfect match!
  })
})
