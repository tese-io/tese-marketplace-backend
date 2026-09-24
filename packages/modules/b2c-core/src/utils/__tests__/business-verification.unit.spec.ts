import {
  deriveBusinessVerificationState,
  isBusinessVerified,
  isPrivateUploadKey,
  normalizeCountryCode,
  normalizeLegalName,
  normalizeRegistrationNumber,
  toOcrPrefill
} from '../business-verification'

const row = (
  status: 'pending' | 'verified' | 'rejected' | 'archived',
  created_at: string,
  extra: { reviewer_note?: string | null } = {}
): {
  id: string
  status: 'pending' | 'verified' | 'rejected' | 'archived'
  created_at: string
  reviewer_note?: string | null
} => ({ id: `sverif_${status}_${created_at}`, status, created_at, ...extra })

describe('isPrivateUploadKey (G-12 signed-read guard)', () => {
  it('accepts only single-segment keys under the private prefix', () => {
    expect(isPrivateUploadKey('marketplace/uploads/private/brn-abc123.pdf')).toBe(true)
    expect(isPrivateUploadKey('marketplace/uploads/public/brn.pdf')).toBe(false)
    expect(isPrivateUploadKey('marketplace/uploads/private/../public/x.pdf')).toBe(false)
    expect(isPrivateUploadKey('marketplace/uploads/private/sub/x.pdf')).toBe(false)
    expect(isPrivateUploadKey('https://host/marketplace/uploads/private/x.pdf')).toBe(false)
    expect(isPrivateUploadKey('')).toBe(false)
    expect(isPrivateUploadKey(null)).toBe(false)
  })
})

describe('deriveBusinessVerificationState', () => {
  it('nothing submitted → needed', () => {
    expect(deriveBusinessVerificationState([])).toEqual({ state: 'needed', current: null })
    expect(deriveBusinessVerificationState(undefined).state).toBe('needed')
  })

  it('a pending row → under_review', () => {
    const r = deriveBusinessVerificationState([row('pending', '2026-09-25T10:00:00Z')])
    expect(r.state).toBe('under_review')
    expect(r.current?.id).toContain('pending')
  })

  it('declined then re-uploaded → under_review (newest pending wins over old decline)', () => {
    const r = deriveBusinessVerificationState([
      row('rejected', '2026-09-20T10:00:00Z', { reviewer_note: 'blurry' }),
      row('pending', '2026-09-25T10:00:00Z')
    ])
    expect(r.state).toBe('under_review')
  })

  it('only declines → declined with the NEWEST note', () => {
    const r = deriveBusinessVerificationState([
      row('rejected', '2026-09-20T10:00:00Z', { reviewer_note: 'old' }),
      row('rejected', '2026-09-22T10:00:00Z', { reviewer_note: 'new' })
    ])
    expect(r.state).toBe('declined')
    expect(r.current?.reviewer_note).toBe('new')
  })

  it('verified always wins, archived never counts', () => {
    const r = deriveBusinessVerificationState([
      row('verified', '2026-09-01T10:00:00Z'),
      row('pending', '2026-09-25T10:00:00Z'),
      row('archived', '2026-09-26T10:00:00Z')
    ])
    expect(r.state).toBe('verified')
    expect(isBusinessVerified([row('archived', '2026-09-26T10:00:00Z')])).toBe(false)
  })
})

describe('normalizers', () => {
  it('legal names compare without case, punctuation, accents or suffixes', () => {
    expect(normalizeLegalName('Lagoon Test Supplies Ltd.')).toBe('lagoon test supplies')
    expect(normalizeLegalName('LAGOON TEST SUPPLIES LIMITED')).toBe('lagoon test supplies')
    expect(normalizeLegalName('Récifs & Co, Ltée')).toBe('recifs and')
    expect(normalizeLegalName('Ltd')).toBe('ltd') // never strip the whole name
    expect(normalizeLegalName(null)).toBe('')
  })

  it('registration numbers and country codes', () => {
    expect(normalizeRegistrationNumber('  c12345 / 2020 ')).toBe('C12345 / 2020')
    expect(normalizeCountryCode('MU')).toBe('mu')
    expect(normalizeCountryCode('Mauritius')).toBeNull()
    expect(normalizeCountryCode(undefined)).toBeNull()
  })
})

describe('toOcrPrefill', () => {
  it('maps a partial OCR response and normalises what it can', () => {
    expect(
      toOcrPrefill({
        legal_name: ' Lagoon Test Supplies Ltd ',
        registration_number: 'c 12345',
        country_of_registration: 'MU',
        document_kind: 'registration_extract',
        confidence: 0.82
      })
    ).toEqual({
      legal_name: 'Lagoon Test Supplies Ltd',
      registration_number: 'C 12345',
      country_of_registration: 'mu',
      document_kind: 'registration_extract',
      confidence: 0.82
    })
  })

  it('returns null when nothing usable came back', () => {
    expect(toOcrPrefill({ confidence: 0.1 })).toBeNull()
    expect(toOcrPrefill(null)).toBeNull()
    expect(toOcrPrefill({ document_kind: 'passport' })).toBeNull()
  })
})
