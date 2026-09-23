import { VendorCreateSeller } from '../validators'

const base = {
  name: 'Acme Marine',
  member: { name: 'Al', email: 'al@acmemarine.mu' },
}

describe('VendorCreateSeller — website + company_type (B-01/C5)', () => {
  it('accepts a valid https website and a known company_type', () => {
    const out = VendorCreateSeller.safeParse({
      ...base,
      website: 'https://acmemarine.mu',
      company_type: 'manufacturer',
    })
    expect(out.success).toBe(true)
  })

  it('rejects javascript: URLs (XSS vector when rendered as href)', () => {
    const out = VendorCreateSeller.safeParse({
      ...base,
      website: 'javascript:alert(1)',
    })
    expect(out.success).toBe(false)
  })

  it('rejects an unknown company_type', () => {
    const out = VendorCreateSeller.safeParse({
      ...base,
      company_type: 'conglomerate',
    })
    expect(out.success).toBe(false)
  })

  it('both fields stay optional — the bare legacy payload still passes', () => {
    const out = VendorCreateSeller.safeParse(base)
    expect(out.success).toBe(true)
  })

  it('stays strict: unknown keys are still rejected', () => {
    const out = VendorCreateSeller.safeParse({ ...base, rogue: true })
    expect(out.success).toBe(false)
  })
})
