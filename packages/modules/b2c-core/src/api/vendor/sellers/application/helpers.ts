/**
 * Wire mapper for the B-05 application-status endpoint.
 *
 * Deliberately narrow: the applicant sees their application's STATE,
 * never the raw request row. reviewer_note only surfaces on rejection
 * (that is the one case the applicant is told why).
 */

export type SellerApplicationRow = {
  id: string
  status: 'pending' | 'accepted' | 'rejected' | 'draft'
  created_at?: string | Date | null
  updated_at?: string | Date | null
  reviewer_id?: string | null
  reviewer_note?: string | null
  data?: {
    seller?: { name?: string | null } | null
    claim_target_seller_id?: string | null
  } | null
}

export type SellerApplicationWire = {
  status: 'received' | 'under_review' | 'approved' | 'declined'
  submitted_at: string | null
  reviewed_at: string | null
  seller_name: string | null
  /** Only present when declined. */
  reviewer_note?: string
  /** True when this application requests access to an existing store
   *  (SSO claim path) rather than creation of a new one. */
  claim: boolean
}

function iso(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Re-application after a rejection creates a second request row — the
 * status page always shows the CURRENT application: a live (pending/
 * draft/accepted) one wins over rejected history; ties break to the
 * newest submission.
 */
export function pickLatestApplication(
  rows: SellerApplicationRow[] | null | undefined
): SellerApplicationRow | null {
  if (!rows?.length) return null
  const sorted = [...rows].sort((a, b) => {
    const aLive = a.status !== 'rejected' ? 1 : 0
    const bLive = b.status !== 'rejected' ? 1 : 0
    if (aLive !== bLive) return bLive - aLive
    const at = a.created_at ? new Date(a.created_at).getTime() : 0
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0
    return bt - at
  })
  return sorted[0]
}

export function toApplicationWire(
  row: SellerApplicationRow | null | undefined
): SellerApplicationWire | null {
  if (!row) return null

  let status: SellerApplicationWire['status']
  switch (row.status) {
    case 'accepted':
      status = 'approved'
      break
    case 'rejected':
      status = 'declined'
      break
    default:
      // 'draft' and 'pending' both read as received; a reviewer having
      // opened it is not tracked, so under_review is reserved for a
      // future reviewer-activity signal — today pending == received.
      status = 'received'
      break
  }

  const wire: SellerApplicationWire = {
    status,
    submitted_at: iso(row.created_at),
    reviewed_at: row.reviewer_id ? iso(row.updated_at) : null,
    seller_name: row.data?.seller?.name?.trim() || null,
    claim: Boolean(row.data?.claim_target_seller_id),
  }

  if (status === 'declined' && row.reviewer_note?.trim()) {
    wire.reviewer_note = row.reviewer_note.trim()
  }

  return wire
}
