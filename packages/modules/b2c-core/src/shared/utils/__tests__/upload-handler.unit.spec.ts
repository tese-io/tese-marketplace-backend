import { handleMarketplaceUploads } from '../upload-handler'
import { resolveUploadTarget } from '../r2-upload'

jest.mock('../r2-upload', () => {
  const actual = jest.requireActual('../r2-upload')
  return {
    ...actual,
    isRemoteStorageConfigured: jest.fn(() => true),
    putApprovedUpload: jest.fn(async (approved, _buffer, purpose) => {
      const target = actual.resolveUploadTarget(approved, purpose)
      const key = `${target.prefix}${approved.filename}`
      return {
        id: key,
        url: `${target.fileUrl}/${key}`,
        key,
        visibility: target.visibility
      }
    })
  }
})

const pngBytes = () =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(16)
  ])

const csvBytes = () => Buffer.from('sku,name\n1,Shoe\n')

const jsonRes = () => {
  const body: { status?: number; payload?: any } = {}
  return {
    body,
    status (code: number) {
      body.status = code
      return this
    },
    json (payload: any) {
      body.payload = payload
      return this
    }
  }
}

describe('shared marketplace upload handler', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env.S3_BUCKET = 'tese-staging'
    process.env.S3_FILE_URL = 'https://pub-private.r2.dev'
    process.env.S3_PUBLIC_BUCKET = 'tese-staging-public'
    process.env.S3_PUBLIC_FILE_URL = 'https://pub-public.r2.dev'
    process.env.S3_ACCESS_KEY_ID = 'akid'
  })

  afterEach(() => {
    process.env = { ...original }
    jest.clearAllMocks()
  })

  it('puts an admin product image on the public bucket', async () => {
    const res = jsonRes()
    await handleMarketplaceUploads(
      {
        files: [
          {
            originalname: 'shoe.png',
            mimetype: 'image/png',
            buffer: pngBytes()
          }
        ],
        query: {}
      } as any,
      res as any
    )

    expect(res.body.status).toBe(200)
    expect(res.body.payload.files).toHaveLength(1)
    expect(res.body.payload.files[0].visibility).toBe('public')
    expect(res.body.payload.files[0].url).toMatch(
      /^https:\/\/pub-public\.r2\.dev\/marketplace\/uploads\/public\//
    )
    expect(res.body.payload.files[0].key).toMatch(
      /^marketplace\/uploads\/public\/shoe\.png$/
    )
  })

  it('puts a CSV import on the private bucket', async () => {
    const res = jsonRes()
    await handleMarketplaceUploads(
      {
        files: [
          {
            originalname: 'products.csv',
            mimetype: 'text/csv',
            buffer: csvBytes()
          }
        ],
        query: {}
      } as any,
      res as any
    )

    expect(res.body.status).toBe(200)
    expect(res.body.payload.files[0].visibility).toBe('private')
    expect(res.body.payload.files[0].url).toMatch(
      /^https:\/\/pub-private\.r2\.dev\/marketplace\/uploads\/private\//
    )
    expect(
      resolveUploadTarget({
        filename: 'products.csv',
        mimeType: 'text/csv',
        extension: 'csv'
      }).prefix
    ).toBe('marketplace/uploads/private/')
  })
})
