import {
  extractEmailDomain,
  extractWebsiteHost,
  lookupVendorDuplicates,
  notifySellerLinked,
} from '../tese-vendor-claims'

describe('extractEmailDomain', () => {
  it('lowercases and takes the part after the last @', () => {
    expect(extractEmailDomain('Boss@AcmeMarine.MU')).toBe('acmemarine.mu')
    expect(extractEmailDomain('weird@nested@corp.io')).toBe('corp.io')
  })
  it('returns null for malformed input', () => {
    expect(extractEmailDomain('no-at-sign')).toBeNull()
    expect(extractEmailDomain('trailing@')).toBeNull()
    expect(extractEmailDomain(undefined)).toBeNull()
    expect(extractEmailDomain(42 as unknown as string)).toBeNull()
  })
})

describe('extractWebsiteHost', () => {
  it('strips protocol, www, port and path', () => {
    expect(extractWebsiteHost('https://www.AcmeMarine.mu/about')).toBe('acmemarine.mu')
    expect(extractWebsiteHost('acmemarine.mu:8080/x')).toBe('acmemarine.mu')
    expect(extractWebsiteHost('http://acmemarine.mu')).toBe('acmemarine.mu')
  })
  it('returns null for empty/invalid input', () => {
    expect(extractWebsiteHost('')).toBeNull()
    expect(extractWebsiteHost('   ')).toBeNull()
    expect(extractWebsiteHost(null)).toBeNull()
  })
})

describe('lookupVendorDuplicates', () => {
  const realFetch = global.fetch
  beforeEach(() => {
    process.env.TESE_BACKEND_API_KEY = 'test-key'
  })
  afterEach(() => {
    global.fetch = realFetch
    delete process.env.TESE_BACKEND_API_KEY
    jest.restoreAllMocks()
  })

  it('sends the identifier as-is and parses the wire shape', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        domain: 'acmemarine.mu',
        domain_usable: true,
        reason: null,
        candidate: { domain: 'acmemarine.mu', name: 'Acme' },
        tenants: [{ id: 't1', name: 'Acme', matched_on: 'website' }],
      }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const out = await lookupVendorDuplicates({ email: 'a@acmemarine.mu' })
    expect(out.domain).toBe('acmemarine.mu')
    expect(out.domain_usable).toBe(true)
    expect(out.tenants).toHaveLength(1)

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/api/v3/marketplace/vendor-claims/lookup')
    expect(url).toContain('email=a%40acmemarine.mu')
  })

  it('throws on a non-2xx response (callers decide fatality)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'unavailable' }),
    }) as unknown as typeof fetch

    await expect(lookupVendorDuplicates({ email: 'a@b.co' })).rejects.toThrow(
      'unavailable'
    )
  })
})

describe('notifySellerLinked', () => {
  const realFetch = global.fetch
  beforeEach(() => {
    process.env.TESE_BACKEND_API_KEY = 'test-key'
  })
  afterEach(() => {
    global.fetch = realFetch
    delete process.env.TESE_BACKEND_API_KEY
    jest.restoreAllMocks()
  })

  it('short-circuits when not configured (no fetch call)', async () => {
    delete process.env.TESE_BACKEND_API_KEY
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const out = await notifySellerLinked({
      sellerId: 'sel_1',
      via: 'seller_create',
    })
    expect(out.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never throws — network failure returns ok:false', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch

    const out = await notifySellerLinked({
      domain: 'acmemarine.mu',
      sellerId: 'sel_1',
      via: 'seller_create',
    })
    expect(out.ok).toBe(false)
    expect(out.error).toContain('ECONNREFUSED')
  })

  it('flags a 409 as conflict (duplicate to report, not merge)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'already linked to sel_OTHER' }),
    }) as unknown as typeof fetch

    const out = await notifySellerLinked({
      domain: 'acmemarine.mu',
      sellerId: 'sel_1',
      via: 'seller_claim',
    })
    expect(out.ok).toBe(false)
    expect(out.conflict).toBe(true)
  })
})
