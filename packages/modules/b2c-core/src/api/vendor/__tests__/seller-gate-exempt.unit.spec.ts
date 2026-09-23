import { SELLER_GATE_EXEMPT_RE } from '../middlewares'

/**
 * AUTH-CRITICAL regression guard. These are the only /vendor/* paths an
 * unapproved (or unauthenticated-as-seller) identity may reach. A miss
 * here is either a locked-out applicant or an open seller API.
 */

const EXEMPT = [
  '/vendor/sellers',
  '/vendor/sellers/tese',
  '/vendor/sellers/application',
  '/vendor/invites/accept',
]

const GUARDED = [
  '/vendor/products',
  '/vendor/products/import',
  '/vendor/sellers/me',
  '/vendor/sellers/me/onboarding',
  '/vendor/sellers/me/matchability',
  '/vendor/sellers/applicationX',
  '/vendor/sellers/application/extra',
  '/vendor/sellers/tese/extra',
  '/vendor/sellersX',
  '/vendor/invites',
  '/vendor/invites/acceptX',
  '/vendor/orders',
  '/vendor/coverage',
  '/vendor/seller-certifications',
  '/vendor/payout-account',
]

describe('SELLER_GATE_EXEMPT_RE (approved-seller gate exemptions)', () => {
  it.each(EXEMPT)('exempts exactly %s', (path) => {
    expect(SELLER_GATE_EXEMPT_RE.test(path)).toBe(true)
  })

  it.each(GUARDED)('keeps %s behind the gate', (path) => {
    expect(SELLER_GATE_EXEMPT_RE.test(path)).toBe(false)
  })
})
