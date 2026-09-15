/**
 * Read/write client for the tese-backend vendor_coverage endpoints (P3.3/P3.4).
 *
 * Called from Mercur's /vendor/coverage + /vendor/activities routes when a
 * seller manages their "Activities I serve" list from the vendor-panel.
 *
 * Sellers never authenticate against tese-backend directly. Mercur:
 *   1. Resolves the Mercur seller_id from the Medusa auth actor
 *   2. Calls tese-backend using its service X-API-Key
 *   3. Locks subject.kind='seller' and subject.id=<mercur_seller_id> server-side
 *      so a compromised UI can't write coverage for another seller.
 *
 * Env: TESE_BACKEND_URL, TESE_BACKEND_API_KEY (service API key minted in
 * tese-backend s-admin → API keys, permissions:
 *   read:nbs_canonicalize, read:vendor_coverage, write:vendor_coverage).
 */

const TESE_BACKEND_URL = (
  process.env.TESE_BACKEND_URL || 'http://localhost:8000'
).replace(/\/$/, '')

const TESE_BACKEND_API_KEY = process.env.TESE_BACKEND_API_KEY || ''


export type CoverageRow = {
  _id?: string
  subject: { kind: string; id: string }
  activity_code: string
  coverage_kind: 'DIRECT' | 'INDIRECT'
  source: string
  confidence: number
  is_active: boolean
  createdAt?: string
  updatedAt?: string
}

export type ActivityHit = {
  code: string
  name: string
  description?: string | null
  industry_vertical?: string | null
  domain?: string | null
  subset?: string | null
}

/** CoverageRow + the display fields the vendor panel renders in its table. */
export type EnrichedCoverageRow = CoverageRow & {
  activity_name?: string | null
  activity_description?: string | null
  industry_vertical?: string | null
  domain?: string | null
}

/**
 * Merge activity catalog hits into coverage rows so the panel can show
 * "Rainwater harvesting system" instead of a bare TOU-ADAC-01.01. Pure —
 * unit-tested; rows whose code has no hit pass through unchanged (the
 * panel falls back to rendering the code).
 */
export function enrichCoverageRowsWithActivities(
  rows: CoverageRow[],
  activities: ActivityHit[]
): EnrichedCoverageRow[] {
  const byCode = new Map(activities.map((a) => [a.code, a]))
  return rows.map((row) => {
    const hit = byCode.get(row.activity_code)
    if (!hit) return row
    return {
      ...row,
      activity_name: hit.name || null,
      activity_description: hit.description || null,
      industry_vertical: hit.industry_vertical || null,
      domain: hit.domain || null,
    }
  })
}


export const isVendorCoverageConfigured = () => Boolean(TESE_BACKEND_API_KEY)


function _headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': TESE_BACKEND_API_KEY,
  }
}


/**
 * List all coverage rows for a seller (all activity codes they've declared).
 */
export async function fetchSellerCoverage(sellerId: string): Promise<CoverageRow[]> {
  const response = await fetch(
    `${TESE_BACKEND_URL}/api/v3/marketplace/vendor-coverage/find`,
    {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify({
        by_subject: {
          subject: { kind: 'seller', id: sellerId },
          is_active: true,
          limit: 500,
        },
      }),
      cache: 'no-store',
    }
  )
  const json = (await response.json().catch(() => ({}))) as { rows?: CoverageRow[]; error?: string }
  if (!response.ok) {
    throw new Error(json.error || `vendor-coverage/find returned ${response.status}`)
  }
  return Array.isArray(json.rows) ? json.rows : []
}


/**
 * List coverage rows for one specific product (subject.kind='product').
 * Used by the seller's Coverage Overview page to show every activity code
 * the classifier attached to their products, so the seller can see the
 * full set of activities they're being surfaced for — not just the ones
 * they explicitly self-declared.
 */
export async function fetchProductCoverage(productId: string): Promise<CoverageRow[]> {
  const response = await fetch(
    `${TESE_BACKEND_URL}/api/v3/marketplace/vendor-coverage/find`,
    {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify({
        by_subject: {
          subject: { kind: 'product', id: productId },
          is_active: true,
          limit: 500,
        },
      }),
      cache: 'no-store',
    }
  )
  const json = (await response.json().catch(() => ({}))) as { rows?: CoverageRow[]; error?: string }
  if (!response.ok) {
    throw new Error(json.error || `vendor-coverage/find (product) returned ${response.status}`)
  }
  return Array.isArray(json.rows) ? json.rows : []
}


/**
 * Add one activity code as coverage for a seller.
 * Source is always 'self_declared' + confidence 1.0 when the seller writes.
 * Server canonicalizes the code and rejects unknown/deprecated codes.
 */
export async function upsertSellerCoverage(
  sellerId: string,
  activityCode: string
): Promise<{ row: CoverageRow; created: boolean }> {
  const response = await fetch(
    `${TESE_BACKEND_URL}/api/v3/marketplace/vendor-coverage/upsert`,
    {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify({
        subject: { kind: 'seller', id: sellerId },
        activity_code: activityCode,
        coverage_kind: 'DIRECT',
        source: 'self_declared',
        confidence: 1.0,
        is_active: true,
      }),
    }
  )
  const json = (await response.json().catch(() => ({}))) as {
    row?: CoverageRow
    created?: boolean
    error?: string
    code?: string
    canonical?: string
    replaced_by?: string
  }
  if (!response.ok) {
    const err: any = new Error(json.error || `vendor-coverage/upsert returned ${response.status}`)
    err.status = response.status
    err.error_code = json.code
    err.replaced_by = json.replaced_by
    throw err
  }
  return { row: json.row as CoverageRow, created: Boolean(json.created) }
}


/**
 * Soft-hide (deactivate) one activity's coverage for the seller.
 */
export async function deactivateSellerCoverage(
  sellerId: string,
  activityCode: string
): Promise<{ matched: number; modified: number }> {
  const response = await fetch(
    `${TESE_BACKEND_URL}/api/v3/marketplace/vendor-coverage/deactivate`,
    {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify({
        subject: { kind: 'seller', id: sellerId },
        activity_code: activityCode,
        coverage_kind: 'DIRECT',
      }),
    }
  )
  const json = (await response.json().catch(() => ({}))) as {
    matched?: number
    modified?: number
    error?: string
  }
  if (!response.ok) {
    throw new Error(json.error || `vendor-coverage/deactivate returned ${response.status}`)
  }
  return {
    matched: Number(json.matched || 0),
    modified: Number(json.modified || 0),
  }
}


/**
 * Autocomplete activity codes. Sellers don't know codes off the top of their
 * head — this drives the picker's search-as-you-type UX.
 */
export async function searchActivities(params: {
  q?: string
  industry_vertical?: string
  domain?: string
  limit?: number
  /** Exact-code batch lookup (deduped server-side, capped at 100). */
  codes?: string[]
}): Promise<ActivityHit[]> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.industry_vertical) search.set('industry_vertical', params.industry_vertical)
  if (params.domain) search.set('domain', params.domain)
  if (params.limit) search.set('limit', String(params.limit))
  if (params.codes?.length) search.set('codes', params.codes.join(','))

  const response = await fetch(
    `${TESE_BACKEND_URL}/api/v3/nbs/activities/search?${search.toString()}`,
    {
      headers: { 'X-API-Key': TESE_BACKEND_API_KEY },
      cache: 'no-store',
    }
  )
  const json = (await response.json().catch(() => ({}))) as { activities?: ActivityHit[]; error?: string }
  if (!response.ok) {
    throw new Error(json.error || `nbs activity search returned ${response.status}`)
  }
  return Array.isArray(json.activities) ? json.activities : []
}
