import { isRemoteStorageConfigured, resolveUploadTarget } from '../r2-upload'

describe('marketplace R2 upload target', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env.S3_BUCKET = 'tese-staging'
    process.env.S3_FILE_URL = 'https://pub-private.r2.dev'
    process.env.S3_PUBLIC_BUCKET = 'tese-staging-public'
    process.env.S3_PUBLIC_FILE_URL = 'https://pub-public.r2.dev'
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('puts a product image on the public bucket and host', () => {
    const target = resolveUploadTarget({
      filename: 'shoe.png',
      mimeType: 'image/png',
      extension: 'png'
    })
    expect(target.visibility).toBe('public')
    expect(target.bucket).toBe('tese-staging-public')
    expect(target.fileUrl).toBe('https://pub-public.r2.dev')
    expect(target.prefix).toBe('marketplace/uploads/public/')
  })

  it('puts a receipt on the private bucket and host', () => {
    const target = resolveUploadTarget({
      filename: 'Receipt-1.pdf',
      mimeType: 'application/pdf',
      extension: 'pdf'
    })
    expect(target.visibility).toBe('private')
    expect(target.bucket).toBe('tese-staging')
    expect(target.fileUrl).toBe('https://pub-private.r2.dev')
    expect(target.prefix).toBe('marketplace/uploads/private/')
  })

  it.each(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'heic', 'heif'])(
    'puts a %s shop image on the public bucket',
    (extension) => {
      const target = resolveUploadTarget({
        filename: `asset.${extension}`,
        mimeType: 'image/png',
        extension
      })
      expect(target.visibility).toBe('public')
      expect(target.bucket).toBe('tese-staging-public')
      expect(target.prefix).toBe('marketplace/uploads/public/')
    }
  )

  it.each(['pdf', 'doc', 'docx'])(
    'puts a %s document on the private bucket',
    (extension) => {
      const target = resolveUploadTarget({
        filename: `proof.${extension}`,
        mimeType: 'application/pdf',
        extension
      })
      expect(target.visibility).toBe('private')
      expect(target.bucket).toBe('tese-staging')
      expect(target.prefix).toBe('marketplace/uploads/private/')
    }
  )

  it('honours purpose=private on an image so a cert photo stays off the public host', () => {
    const target = resolveUploadTarget(
      { filename: 'badge.png', mimeType: 'image/png', extension: 'png' },
      'private'
    )
    expect(target.visibility).toBe('private')
    expect(target.bucket).toBe('tese-staging')
    expect(target.prefix).toBe('marketplace/uploads/private/')
  })

  it('honours purpose=public on a pdf only when the caller is explicit', () => {
    const target = resolveUploadTarget(
      { filename: 'spec.pdf', mimeType: 'application/pdf', extension: 'pdf' },
      'public'
    )
    expect(target.visibility).toBe('public')
    expect(target.bucket).toBe('tese-staging-public')
    expect(target.prefix).toBe('marketplace/uploads/public/')
  })

  it('fails closed to the private bucket for an unknown type', () => {
    const target = resolveUploadTarget({
      filename: 'payload.bin',
      mimeType: 'application/octet-stream',
      extension: 'bin'
    })
    expect(target.visibility).toBe('private')
    expect(target.bucket).toBe('tese-staging')
    expect(target.prefix).toBe('marketplace/uploads/private/')
  })

  it('reports remote storage only when both the key and the private bucket exist', () => {
    delete process.env.S3_ACCESS_KEY_ID
    expect(isRemoteStorageConfigured()).toBe(false)
    process.env.S3_ACCESS_KEY_ID = 'akid'
    expect(isRemoteStorageConfigured()).toBe(true)
    delete process.env.S3_BUCKET
    expect(isRemoteStorageConfigured()).toBe(false)
  })

  it('falls back to the private bucket when the public one is unset', () => {
    delete process.env.S3_PUBLIC_BUCKET
    delete process.env.S3_PUBLIC_FILE_URL
    const target = resolveUploadTarget({
      filename: 'shoe.png',
      mimeType: 'image/png',
      extension: 'png'
    })
    expect(target.visibility).toBe('public')
    expect(target.bucket).toBe('tese-staging')
    expect(target.fileUrl).toBe('https://pub-private.r2.dev')
    expect(target.prefix).toBe('marketplace/uploads/public/')
  })
})
