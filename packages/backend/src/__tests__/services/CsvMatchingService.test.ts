import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CsvMatchingService, MatchType, type MatchInput } from '../../services/CsvMatchingService'
import { MedicalInstitution } from '../../models'
import { InstitutionType } from '@medical-crm/shared'
import { cleanDatabase } from '../helpers/db-mock'
import { sequelize } from '../../config/database'

describe('CsvMatchingService', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true })
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('Priority 1: Accounting Number Matching', () => {
    it('should match by exact accountingNumber with 100% confidence', async () => {
      // Create institution with accounting number
      await MedicalInstitution.create({
        name: 'Hospital Alpha',
        type: InstitutionType.HOSPITAL,
        accountingNumber: 'ACCT-12345',
        address: {
          street: '123 Main St',
          city: 'Paris',
          state: 'Île-de-France',
          zipCode: '75001',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Different Name', // Name doesn't matter
        accountingNumber: 'ACCT-12345',
        address: {
          city: 'Paris'
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      expect(result.matched).toBe(true)
      expect(result.matchType).toBe(MatchType.ACCOUNTING_NUMBER)
      expect(result.confidence).toBe(100)
      expect(result.institution).toBeDefined()
      expect(result.institution!.name).toBe('Hospital Alpha')
    })

    it('should match accountingNumber case-insensitively', async () => {
      await MedicalInstitution.create({
        name: 'Hospital Beta',
        type: InstitutionType.HOSPITAL,
        accountingNumber: 'acct-xyz-789',
        address: {
          street: '456 Oak Ave',
          city: 'Lyon',
          state: 'Auvergne-Rhône-Alpes',
          zipCode: '69001',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Some Hospital',
        accountingNumber: 'ACCT-XYZ-789', // Different case
        address: { city: 'Lyon' }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      expect(result.matched).toBe(true)
      expect(result.matchType).toBe(MatchType.ACCOUNTING_NUMBER)
      expect(result.confidence).toBe(100)
    })
  })

  describe('Priority 2: Exact Name + Address Matching', () => {
    it('should match by exact name and full address with 95% confidence', async () => {
      await MedicalInstitution.create({
        name: 'Clinique Saint-Jean',
        type: InstitutionType.CLINIC,
        address: {
          street: '10 Rue de la Paix',
          city: 'Marseille',
          state: 'Provence-Alpes-Côte d\'Azur',
          zipCode: '13001',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Clinique Saint-Jean',
        address: {
          street: '10 Rue de la Paix',
          city: 'Marseille',
          zipCode: '13001'
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      expect(result.matched).toBe(true)
      expect(result.matchType).toBe(MatchType.EXACT_NAME_ADDRESS)
      expect(result.confidence).toBe(95)
      expect(result.details?.addressMatch).toBe(true)
    })

    it('should not match if address differs', async () => {
      await MedicalInstitution.create({
        name: 'Clinique Saint-Jean',
        type: InstitutionType.CLINIC,
        address: {
          street: '10 Rue de la Paix',
          city: 'Marseille',
          state: 'Provence-Alpes-Côte d\'Azur',
          zipCode: '13001',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Clinique Saint-Jean',
        address: {
          street: '99 Different Street', // Different address
          city: 'Marseille',
          zipCode: '13002' // Different zip
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      // Should fall through to fuzzy matching or no match
      expect(result.matchType).not.toBe(MatchType.EXACT_NAME_ADDRESS)
    })
  })

  describe('Priority 3: Fuzzy Name + City Matching', () => {
    it('should match similar names in same city with high confidence', async () => {
      await MedicalInstitution.create({
        name: 'CHU Hôpital Universitaire de Bordeaux',
        type: InstitutionType.HOSPITAL,
        address: {
          street: '1 Place Amélie Raba-Léon',
          city: 'Bordeaux',
          state: 'Nouvelle-Aquitaine',
          zipCode: '33000',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Hopital Universitaire Bordeaux', // Similar but not exact
        address: {
          street: 'Different street',
          city: 'Bordeaux'
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      expect(result.matched).toBe(true)
      expect(result.matchType).toBe(MatchType.FUZZY_NAME_CITY)
      expect(result.confidence).toBeGreaterThanOrEqual(60)
      expect(result.confidence).toBeLessThanOrEqual(85)
      expect(result.details?.nameSimilarity).toBeGreaterThan(0.8)
      expect(result.details?.cityMatch).toBe(true)
    })

    it('should not match if similarity is below threshold', async () => {
      await MedicalInstitution.create({
        name: 'Clinique des Mimosas',
        type: InstitutionType.CLINIC,
        address: {
          street: '25 Avenue Victor Hugo',
          city: 'Nice',
          state: 'Provence-Alpes-Côte d\'Azur',
          zipCode: '06000',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Hospital Saint-Joseph', // Completely different name
        address: {
          city: 'Nice'
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      expect(result.matched).toBe(false)
      expect(result.matchType).toBe(MatchType.NO_MATCH)
    })

    it('should provide suggestions for near-matches', async () => {
      await MedicalInstitution.create({
        name: 'Centre Hospitalier de Toulouse',
        type: InstitutionType.HOSPITAL,
        address: {
          street: 'Route de Saint-Simon',
          city: 'Toulouse',
          state: 'Occitanie',
          zipCode: '31000',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      await MedicalInstitution.create({
        name: 'Hôpital Purpan Toulouse',
        type: InstitutionType.HOSPITAL,
        address: {
          street: 'Place du Dr Baylac',
          city: 'Toulouse',
          state: 'Occitanie',
          zipCode: '31300',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Hopital Toulouse', // Somewhat similar
        address: {
          city: 'Toulouse'
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      // May or may not match depending on threshold, but should have suggestions
      if (!result.matched) {
        expect(result.suggestions).toBeDefined()
        expect(result.suggestions!.length).toBeGreaterThan(0)
      }
    })
  })

  describe('No Match Scenarios', () => {
    it('should return NO_MATCH when no institution exists', async () => {
      const input: MatchInput = {
        name: 'Non-Existent Hospital',
        address: {
          city: 'Unknown City'
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      expect(result.matched).toBe(false)
      expect(result.matchType).toBe(MatchType.NO_MATCH)
      expect(result.confidence).toBe(0)
      expect(result.institution).toBeUndefined()
    })

    it('should return NO_MATCH when city does not match', async () => {
      await MedicalInstitution.create({
        name: 'Hospital in Paris',
        type: InstitutionType.HOSPITAL,
        address: {
          street: '1 Rue Test',
          city: 'Paris',
          state: 'Île-de-France',
          zipCode: '75001',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Hospital in Paris',
        address: {
          city: 'Lyon' // Different city
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      expect(result.matched).toBe(false)
      expect(result.matchType).toBe(MatchType.NO_MATCH)
    })
  })

  describe('Name Normalization', () => {
    it('should normalize names by removing common prefixes', async () => {
      await MedicalInstitution.create({
        name: 'CHU Saint-Louis',
        type: InstitutionType.HOSPITAL,
        address: {
          street: '1 Avenue Claude Vellefaux',
          city: 'Paris',
          state: 'Île-de-France',
          zipCode: '75010',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const input: MatchInput = {
        name: 'Hôpital Saint-Louis', // Different prefix (Hôpital vs CHU)
        address: {
          city: 'Paris'
        }
      }

      const result = await CsvMatchingService.findBestMatch(input)

      // Should find match due to normalization
      expect(result.matched).toBe(true)
      expect(result.confidence).toBeGreaterThan(70)
    })
  })

  describe('Batch Matching', () => {
    it('should process multiple inputs efficiently', async () => {
      // Create multiple institutions
      await MedicalInstitution.create({
        name: 'Hospital A',
        type: InstitutionType.HOSPITAL,
        accountingNumber: 'A001',
        address: {
          street: '1 Street A',
          city: 'City A',
          state: 'State A',
          zipCode: '11111',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      await MedicalInstitution.create({
        name: 'Hospital B',
        type: InstitutionType.HOSPITAL,
        address: {
          street: '2 Street B',
          city: 'City B',
          state: 'State B',
          zipCode: '22222',
          country: 'France'
        },
        tags: [],
        isActive: true
      })

      const inputs: MatchInput[] = [
        {
          name: 'Hospital A',
          accountingNumber: 'A001',
          address: { city: 'City A' }
        },
        {
          name: 'Hospital B',
          address: {
            street: '2 Street B',
            city: 'City B',
            zipCode: '22222'
          }
        },
        {
          name: 'Non-Existent Hospital',
          address: { city: 'City C' }
        }
      ]

      const results = await CsvMatchingService.findBatchMatches(inputs)

      expect(results).toHaveLength(3)
      expect(results[0].matched).toBe(true)
      expect(results[0].matchType).toBe(MatchType.ACCOUNTING_NUMBER)
      expect(results[1].matched).toBe(true)
      expect(results[1].matchType).toBe(MatchType.EXACT_NAME_ADDRESS)
      expect(results[2].matched).toBe(false)
    })
  })
})
