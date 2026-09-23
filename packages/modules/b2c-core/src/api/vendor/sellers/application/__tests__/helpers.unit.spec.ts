import { pickLatestApplication, toApplicationWire } from '../helpers'

const base = {
  id: 'req_1',
  status: 'pending' as const,
  created_at: '2026-09-22T10:00:00.000Z',
  updated_at: '2026-09-22T10:00:00.000Z',
  reviewer_id: null,
  reviewer_note: null,
  data: { seller: { name: 'Acme Marine' } },
}

describe('toApplicationWire (B-05)', () => {
  it('returns null when there is no application', () => {
    expect(toApplicationWire(null)).toBeNull()
    expect(toApplicationWire(undefined)).toBeNull()
  })

  it('pending → received, no reviewed_at, no reviewer_note', () => {
    const wire = toApplicationWire(base)!
    expect(wire.status).toBe('received')
    expect(wire.submitted_at).toBe('2026-09-22T10:00:00.000Z')
    expect(wire.reviewed_at).toBeNull()
    expect(wire.seller_name).toBe('Acme Marine')
    expect(wire.reviewer_note).toBeUndefined()
    expect(wire.claim).toBe(false)
  })

  it('accepted → approved with reviewed_at', () => {
    const wire = toApplicationWire({
      ...base,
      status: 'accepted',
      reviewer_id: 'user_1',
      updated_at: '2026-09-23T09:00:00.000Z',
    })!
    expect(wire.status).toBe('approved')
    expect(wire.reviewed_at).toBe('2026-09-23T09:00:00.000Z')
  })

  it('rejected → declined and ONLY then exposes the reviewer note', () => {
    const wire = toApplicationWire({
      ...base,
      status: 'rejected',
      reviewer_id: 'user_1',
      reviewer_note: '  Please provide a company website.  ',
    })!
    expect(wire.status).toBe('declined')
    expect(wire.reviewer_note).toBe('Please provide a company website.')

    // The note NEVER leaks on non-declined states.
    const pendingWire = toApplicationWire({
      ...base,
      reviewer_note: 'internal note',
    })!
    expect(pendingWire.reviewer_note).toBeUndefined()
  })

  it('flags SSO claim applications', () => {
    const wire = toApplicationWire({
      ...base,
      data: { seller: { name: 'Acme' }, claim_target_seller_id: 'sel_9' },
    })!
    expect(wire.claim).toBe(true)
  })

  it('re-application: the live request wins over rejected history', () => {
    const rejected = {
      ...base,
      id: 'req_old',
      status: 'rejected' as const,
      created_at: '2026-09-20T10:00:00.000Z',
      reviewer_id: 'user_1',
      reviewer_note: 'add a website',
    }
    const pending = {
      ...base,
      id: 'req_new',
      created_at: '2026-09-22T10:00:00.000Z',
    }
    // Order-independent: live beats rejected either way round
    expect(pickLatestApplication([rejected, pending])?.id).toBe('req_new')
    expect(pickLatestApplication([pending, rejected])?.id).toBe('req_new')
    // Only rejected rows → the newest rejection shows (with its note)
    const olderRejected = { ...rejected, id: 'req_older', created_at: '2026-09-18T10:00:00.000Z' }
    expect(pickLatestApplication([olderRejected, rejected])?.id).toBe('req_old')
    expect(pickLatestApplication([])).toBeNull()
    expect(pickLatestApplication(undefined)).toBeNull()
  })

  it('tolerates missing/garbage dates and empty names', () => {
    const wire = toApplicationWire({
      ...base,
      created_at: 'not-a-date',
      data: { seller: { name: '   ' } },
    })!
    expect(wire.submitted_at).toBeNull()
    expect(wire.seller_name).toBeNull()
  })
})
