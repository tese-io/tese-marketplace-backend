import {
  DEFAULT_RETENTION_DAYS,
  retentionDaysFromEnv,
  runBusinessVerificationRetention,
  selectDocumentsToPurge
} from '../business-verification-retention'

const NOW = new Date('2026-12-31T03:30:00Z')
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString()
const KEY = 'marketplace/uploads/private/brn-abc123.pdf'

describe('retentionDaysFromEnv', () => {
  it('defaults to 90 and rejects nonsense', () => {
    expect(retentionDaysFromEnv({})).toBe(DEFAULT_RETENTION_DAYS)
    expect(retentionDaysFromEnv({ KYB_DOCUMENT_RETENTION_DAYS: '0' })).toBe(90)
    expect(retentionDaysFromEnv({ KYB_DOCUMENT_RETENTION_DAYS: 'soon' })).toBe(90)
    expect(retentionDaysFromEnv({ KYB_DOCUMENT_RETENTION_DAYS: '30' })).toBe(30)
  })
})

describe('selectDocumentsToPurge', () => {
  it('picks declined/archived rows past the window that still hold a document', () => {
    const rows = [
      { id: 'old-rejected', status: 'rejected', document_key: KEY, reviewed_at: daysAgo(91) },
      { id: 'edge-rejected', status: 'rejected', document_key: KEY, reviewed_at: daysAgo(90) },
      { id: 'fresh-rejected', status: 'rejected', document_key: KEY, reviewed_at: daysAgo(89) },
      { id: 'old-archived', status: 'archived', document_key: KEY, reviewed_at: null, updated_at: daysAgo(120) },
      { id: 'old-pending', status: 'pending', document_key: KEY, created_at: daysAgo(400) },
      { id: 'old-verified', status: 'verified', document_key: KEY, reviewed_at: daysAgo(400) },
      { id: 'already-purged', status: 'rejected', document_key: null, document_purged_at: daysAgo(10), reviewed_at: daysAgo(200) },
      { id: 'no-dates', status: 'rejected', document_key: KEY }
    ]
    expect(selectDocumentsToPurge(rows, NOW, 90).map((r) => r.id)).toEqual([
      'old-rejected',
      'edge-rejected',
      'old-archived'
    ])
  })
})

describe('runBusinessVerificationRetention', () => {
  const makeService = (rows: any[]) => ({
    listSellerVerifications: jest.fn(async (_f: any, cfg: any) => {
      const { take, skip } = cfg
      return rows.slice(skip, skip + take)
    }),
    updateSellerVerifications: jest.fn(async () => undefined)
  })
  const quiet = { warn: jest.fn(), error: jest.fn() }

  it('deletes the object first, then clears the record, paging through candidates', async () => {
    const rows = [
      { id: 'a', status: 'rejected', document_key: KEY, reviewed_at: daysAgo(100) },
      { id: 'b', status: 'rejected', document_key: KEY, reviewed_at: daysAgo(5) },
      { id: 'c', status: 'archived', document_key: KEY, reviewed_at: daysAgo(100) }
    ]
    const service = makeService(rows)
    const order: string[] = []
    const deleteObject = jest.fn(async () => { order.push('delete') })
    service.updateSellerVerifications.mockImplementation(async () => { order.push('update') })

    const result = await runBusinessVerificationRetention({
      service, deleteObject, now: NOW, days: 90, log: quiet, pageSize: 2
    })

    expect(service.listSellerVerifications).toHaveBeenCalledTimes(2)
    expect(service.listSellerVerifications.mock.calls[0][0]).toEqual({ status: ['rejected', 'archived'] })
    expect(deleteObject).toHaveBeenCalledTimes(2)
    expect(deleteObject).toHaveBeenCalledWith(KEY)
    expect(order).toEqual(['delete', 'update', 'delete', 'update'])
    expect(service.updateSellerVerifications).toHaveBeenCalledWith({
      selector: { id: 'a' },
      data: { document_key: null, document_url: null, document_filename: null, document_purged_at: NOW }
    })
    expect(result).toEqual({ days: 90, scanned: 3, due: 2, purged: 2, failed: 0 })
  })

  it('leaves the row untouched when the delete fails, so it is retried next run', async () => {
    const service = makeService([
      { id: 'a', status: 'rejected', document_key: KEY, reviewed_at: daysAgo(100) }
    ])
    const deleteObject = jest.fn(async () => { throw new Error('storage down') })
    const log = { warn: jest.fn(), error: jest.fn() }

    const result = await runBusinessVerificationRetention({
      service, deleteObject, now: NOW, days: 90, log
    })

    expect(service.updateSellerVerifications).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('storage down'))
    expect(result).toMatchObject({ due: 1, purged: 0, failed: 1 })
  })

  it('never signs off a key outside the private prefix — clears the record and warns', async () => {
    const service = makeService([
      { id: 'a', status: 'rejected', document_key: 'marketplace/uploads/public/x.pdf', reviewed_at: daysAgo(100) }
    ])
    const deleteObject = jest.fn(async () => undefined)
    const log = { warn: jest.fn(), error: jest.fn() }

    await runBusinessVerificationRetention({ service, deleteObject, now: NOW, days: 90, log })

    expect(deleteObject).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(service.updateSellerVerifications).toHaveBeenCalledTimes(1)
  })
})
