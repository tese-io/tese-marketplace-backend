import {
  formatIncompleteMessage,
  hasPricedVariant,
  missingFields,
  INCOMPLETE_CODE,
} from '../seller-completeness'

const complete = {
  activityCount: 3,
  hasWarehouseCoordinates: true,
  contactEmail: 'sales@acmemarine.mu',
  hasPrice: true,
}

describe('missingFields (D-04 gate decision)', () => {
  it('passes a fully complete seller', () => {
    expect(missingFields(complete)).toEqual([])
  })

  it('names every missing field', () => {
    expect(
      missingFields({
        activityCount: 0,
        hasWarehouseCoordinates: false,
        contactEmail: null,
        hasPrice: false,
      })
    ).toEqual(['activities', 'warehouse_coordinates', 'contact_email', 'price'])
  })

  it('flags each field independently', () => {
    expect(missingFields({ ...complete, activityCount: 0 })).toEqual(['activities'])
    expect(missingFields({ ...complete, hasWarehouseCoordinates: false })).toEqual([
      'warehouse_coordinates',
    ])
    expect(missingFields({ ...complete, contactEmail: null })).toEqual([
      'contact_email',
    ])
    expect(missingFields({ ...complete, hasPrice: false })).toEqual(['price'])
  })

  it('coverage-service outage (null count) fails OPEN on activities only', () => {
    expect(missingFields({ ...complete, activityCount: null })).toEqual([])
    expect(
      missingFields({
        activityCount: null,
        hasWarehouseCoordinates: false,
        contactEmail: null,
        hasPrice: false,
      })
    ).toEqual(['warehouse_coordinates', 'contact_email', 'price'])
  })
})

describe('hasPricedVariant', () => {
  it('accepts one positive price anywhere', () => {
    expect(
      hasPricedVariant([
        { prices: [] },
        { prices: [{ amount: 0 }, { amount: 250 }] },
      ])
    ).toBe(true)
  })

  it('rejects empty, zero, negative and junk amounts', () => {
    expect(hasPricedVariant([])).toBe(false)
    expect(hasPricedVariant(undefined)).toBe(false)
    expect(hasPricedVariant([{ prices: [{ amount: 0 }] }])).toBe(false)
    expect(hasPricedVariant([{ prices: [{ amount: -5 }] }])).toBe(false)
    expect(
      hasPricedVariant([{ prices: [{ amount: 'abc' as unknown as number }] }])
    ).toBe(false)
    expect(hasPricedVariant([{ prices: null }])).toBe(false)
  })

  it('accepts string amounts (DB rows serialize bignumbers as strings)', () => {
    expect(hasPricedVariant([{ prices: [{ amount: '199.99' }] }])).toBe(true)
  })
})

describe('formatIncompleteMessage', () => {
  it('is human-readable AND machine-parseable', () => {
    const msg = formatIncompleteMessage(['activities', 'price'])
    expect(msg).toContain('service activities')
    expect(msg).toContain('product price')
    const match = msg.match(new RegExp(`${INCOMPLETE_CODE}:([a-z_,]+)`))
    expect(match?.[1]).toBe('activities,price')
  })
})
