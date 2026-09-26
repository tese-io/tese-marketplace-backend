import { privateKeyFromStoredUrl } from '../r2-upload'

describe('privateKeyFromStoredUrl (signed reads for stored private URLs)', () => {
  const OLD = process.env.S3_FILE_URL
  afterEach(() => {
    if (OLD === undefined) delete process.env.S3_FILE_URL
    else process.env.S3_FILE_URL = OLD
  })

  it('resolves a URL on the configured private host', () => {
    process.env.S3_FILE_URL = 'https://files.example.com'
    expect(
      privateKeyFromStoredUrl('https://files.example.com/marketplace/uploads/private/cert-abc.pdf?x=1')
    ).toBe('marketplace/uploads/private/cert-abc.pdf')
  })

  it('resolves by prefix when the host changed or is unset', () => {
    delete process.env.S3_FILE_URL
    expect(
      privateKeyFromStoredUrl('https://old-host.r2.dev/marketplace/uploads/private/cert-abc.pdf')
    ).toBe('marketplace/uploads/private/cert-abc.pdf')
  })

  it('returns null for external links, public assets and path tricks', () => {
    process.env.S3_FILE_URL = 'https://files.example.com'
    expect(privateKeyFromStoredUrl('https://www.blueflag.global/registry/123')).toBeNull()
    expect(privateKeyFromStoredUrl('https://files.example.com/marketplace/uploads/public/logo.png')).toBeNull()
    expect(privateKeyFromStoredUrl('https://files.example.com/marketplace/uploads/private/../public/x.pdf')).toBeNull()
    expect(privateKeyFromStoredUrl('https://files.example.com/marketplace/uploads/private/a/b.pdf')).toBeNull()
    expect(privateKeyFromStoredUrl('')).toBeNull()
    expect(privateKeyFromStoredUrl(null)).toBeNull()
  })
})
