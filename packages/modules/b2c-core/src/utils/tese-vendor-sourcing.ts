/**
 * Read/write client for the tese-backend vendor-sourcing ops queue
 * (cni_vendor_search_requests — the "Ask tese.io" tickets).
 *
 * Consumed by the Mercur ADMIN panel's "Sourcing requests" screen: the
 * operator lists open tickets across all tenants and drives the status
 * loop (pending → in_progress → complete/cancelled).
 *
 * Env: TESE_BACKEND_URL, TESE_BACKEND_API_KEY (service API key needs
 * permissions read:vendor_sourcing, write:vendor_sourcing).
 */

const TESE_BACKEND_URL = (
  process.env.TESE_BACKEND_URL || 'http://localhost:8000'
).replace(/\/$/, '')

const TESE_BACKEND_API_KEY = process.env.TESE_BACKEND_API_KEY || ''

export const isVendorSourcingConfigured = () => Boolean(TESE_BACKEND_API_KEY)

export type SourcingRequest = {
  id: string
  projectId: string
  projectName?: string
  requesterEmail?: string
  kind: 'vendor_sourcing' | 'contact_sourcing'
  vendorId?: string | null
  vendorName?: string
  vendorWebsite?: string
  toolNames: string[]
  vendorCategories: string[]
  country: string
  notes: string
  status: 'pending' | 'in_progress' | 'complete' | 'cancelled'
  resolutionNotes: string
  vendorsAdded: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

function _headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': TESE_BACKEND_API_KEY,
  }
}

/** Build the query string for the ops listing — exported for unit tests. */
export function buildSourcingListQuery(params: {
  statuses?: string[]
  kind?: string
  limit?: number
}): string {
  const search = new URLSearchParams()
  if (params.statuses?.length) search.set('statuses', params.statuses.join(','))
  if (params.kind) search.set('kind', params.kind)
  if (params.limit) search.set('limit', String(params.limit))
  return search.toString()
}

export async function listSourcingRequests(params: {
  statuses?: string[]
  kind?: string
  limit?: number
}): Promise<SourcingRequest[]> {
  const qs = buildSourcingListQuery(params)
  const response = await fetch(
    `${TESE_BACKEND_URL}/api/v3/marketplace/vendor-sourcing/requests${qs ? `?${qs}` : ''}`,
    { headers: _headers(), cache: 'no-store' }
  )
  const json = (await response.json().catch(() => ({}))) as {
    status?: boolean
    data?: SourcingRequest[]
    msg?: string
  }
  if (!response.ok || !json.status) {
    throw new Error(json.msg || `vendor-sourcing list returned ${response.status}`)
  }
  return Array.isArray(json.data) ? json.data : []
}

export async function patchSourcingRequest(
  id: string,
  body: { status?: string; resolutionNotes?: string; vendorsAdded?: number }
): Promise<SourcingRequest> {
  const response = await fetch(
    `${TESE_BACKEND_URL}/api/v3/marketplace/vendor-sourcing/requests/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: _headers(), body: JSON.stringify(body) }
  )
  const json = (await response.json().catch(() => ({}))) as {
    status?: boolean
    data?: SourcingRequest
    msg?: string
  }
  if (!response.ok || !json.status || !json.data) {
    throw new Error(json.msg || `vendor-sourcing patch returned ${response.status}`)
  }
  return json.data
}
