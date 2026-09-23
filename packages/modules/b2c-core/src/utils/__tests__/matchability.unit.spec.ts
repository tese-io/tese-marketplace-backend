import { computeMatchability, MatchabilitySignals } from '../matchability'

const fullyMatchable: MatchabilitySignals = {
  products: { count: 12 },
  images: { withImage: 12, total: 12 },
  prices: { priced: 12, total: 12 },
  contact_email: true,
  geo: true,
  ship_to: true,
  coverage: { count: 4 },
  certifications: { verified: 1 },
  tese_verified: true,
}

describe('computeMatchability (B-09)', () => {
  it('a fully matchable Mauritius-target vendor scores 100', () => {
    const out = computeMatchability(fullyMatchable)
    expect(out.score).toBe(100)
    expect(out.tese_verified).toBe(true)
    expect(out.signals.every((s) => s.status === 'ok')).toBe(true)
  })

  it("mirrors today's live catalog gaps (0% email, 0% prices, 57% images)", () => {
    // The assessment's real numbers: 30 products, none priced, no
    // contact email, 57% with images, geo on some sellers, nothing
    // self-declared.
    const out = computeMatchability({
      products: { count: 10 },
      images: { withImage: 6, total: 10 },  // ~57%
      prices: { priced: 0, total: 10 },
      contact_email: false,
      geo: false,
      ship_to: true,
      coverage: { count: 0 },
      certifications: { verified: 0 },
      tese_verified: false,
    })
    // earned: products 10 + images 6 + ship_to 10 = 26 of 100
    expect(out.score).toBe(26)
    const by = Object.fromEntries(out.signals.map((s) => [s.key, s]))
    expect(by.coverage.status).toBe('missing')
    expect(by.contact_email.status).toBe('missing')
    expect(by.prices.status).toBe('missing')
    expect(by.images.status).toBe('partial')
    expect(by.images.detail).toEqual({ done: 6, total: 10 })
    expect(by.ship_to.status).toBe('ok')
  })

  it('percentage signals scale their weight', () => {
    const half = computeMatchability({
      ...fullyMatchable,
      prices: { priced: 6, total: 12 },
    })
    // 100 - 15*0.5 = 92.5 → 93
    expect(half.score).toBe(93)
    expect(
      half.signals.find((s) => s.key === 'prices')!.status
    ).toBe('partial')
  })

  it('coverage-service outage drops the signal from the denominator', () => {
    const out = computeMatchability({
      ...fullyMatchable,
      coverage: { count: null },
    })
    // earned 80 of possible 80 → 100, coverage shows unknown
    expect(out.score).toBe(100)
    expect(
      out.signals.find((s) => s.key === 'coverage')!.status
    ).toBe('unknown')
  })

  it('a blank store scores 0 with everything missing', () => {
    const out = computeMatchability({
      products: { count: 0 },
      images: { withImage: 0, total: 0 },
      prices: { priced: 0, total: 0 },
      contact_email: false,
      geo: false,
      ship_to: false,
      coverage: { count: 0 },
      certifications: { verified: 0 },
      tese_verified: false,
    })
    expect(out.score).toBe(0)
    expect(out.signals.every((s) => s.status === 'missing')).toBe(true)
  })

  it('certifications are worth exactly the badge-precondition nudge (5)', () => {
    const withoutCerts = computeMatchability({
      ...fullyMatchable,
      certifications: { verified: 0 },
    })
    expect(withoutCerts.score).toBe(95)
  })
})
