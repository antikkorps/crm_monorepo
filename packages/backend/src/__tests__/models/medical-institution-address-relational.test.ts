import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Op, Sequelize } from 'sequelize'
import { MedicalInstitution } from '../../models/MedicalInstitution'

describe('MedicalInstitution address filtering (relational vs JSONB)', () => {
  const originalEnv = process.env.USE_RELATIONAL_ADDRESSES

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env.USE_RELATIONAL_ADDRESSES = originalEnv
  })

  it('uses relational include when USE_RELATIONAL_ADDRESSES=true', async () => {
    process.env.USE_RELATIONAL_ADDRESSES = 'true'

    const spy = vi.spyOn(MedicalInstitution, 'findAll').mockResolvedValue([] as any)

    await MedicalInstitution.searchInstitutions({ city: 'Paris' } as any)

    expect(spy).toHaveBeenCalledTimes(1)
    const args = spy.mock.calls[0][0]

    // include should contain addressRel with where.city iLike
    const include = args.include as any[]
    const addressInc = include.find(i => i.as === 'addressRel')
    expect(addressInc).toBeTruthy()
    expect(addressInc.required).toBe(true)
    expect(addressInc.where.city[Op.iLike]).toContain('Paris')
  })

  it('uses JSONB filtering when USE_RELATIONAL_ADDRESSES is not true', async () => {
    process.env.USE_RELATIONAL_ADDRESSES = 'false'

    const spy = vi.spyOn(MedicalInstitution, 'findAll').mockResolvedValue([] as any)

    await MedicalInstitution.searchInstitutions({ city: 'Paris' } as any)

    expect(spy).toHaveBeenCalledTimes(1)
    const args = spy.mock.calls[0][0]
    const where = args.where

    expect(where[Op.and]).toBeDefined()
    expect(Array.isArray(where[Op.and])).toBe(true)
    // The first AND item should be a Sequelize.where; we just assert it's an object
    expect(typeof where[Op.and][0]).toBe('object')
    // Ensure no relational include added
    const include = args.include as any[]
    const addressInc = include?.find?.(i => i.as === 'addressRel')
    expect(addressInc).toBeFalsy()
  })
})
