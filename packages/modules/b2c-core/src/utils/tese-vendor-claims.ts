/**
 * Client for the tese-backend vendor-claims API (B-01 claim flow).
 *
 * Two calls:
 *  - lookupVendorDuplicates: read-only duplicate signals for a seller
 *    signup — the AI-discovered candidate for the email domain plus any
 *    tese organisations already operating under it. Matching logic
 *    (canonicalization, free-email blocklist) lives ONLY in tese-backend
 *    (G-05: one matcher); this client sends raw identifiers.
 *  - notifySellerLinked: write-back once a Mercur seller store exists
 *    (created or claimed) so the candidate row advances to `onboarded`.
 *
 * Env: TESE_BACKEND_URL, TESE_BACKEND_API_KEY — same service key as
 * tese-certifications / tese-vendor-coverage.
 */

// Env is read lazily (per call, not at module load) so tests and
// late-injected environments behave predictably.
const baseUrl = () =>
  (process.env.TESE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')

const apiKey = () => process.env.TESE_BACKEND_API_KEY || ''

const timeoutMs = () => Number(process.env.VENDOR_CLAIMS_TIMEOUT_MS || 5000)

export type ClaimsCandidate = {
  domain: string
  name: string
  country: string | null
  website_url: string | null
  logo_url: string | null
  contact_email: string | null
  claimed_status: string
  linked_tenant_id: string | null
  linked_via: string | null
  linked_seller_id: string | null
}

export type ClaimsTenantMatch = {
  id: string
  name: string
  matched_on: 'primary_contact_email' | 'website'
}

export type ClaimsLookupResult = {
  domain: string | null
  domain_usable: boolean
  reason: string | null
  candidate: ClaimsCandidate | null
  tenants: ClaimsTenantMatch[]
}

export const isVendorClaimsConfigured = () => Boolean(apiKey())

/**
 * Local, comparison-only normalizers. The CANONICAL domain always comes
 * from tese-backend's lookup — these exist so Mercur can compare its own
 * seller rows against that canonical value with the same spelling.
 */
export function extractEmailDomain(email: unknown): string | null {
  if (typeof email !== 'string') return null
  const at = email.lastIndexOf('@')
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).trim().toLowerCase() || null
}

export function extractWebsiteHost(website: unknown): string | null {
  if (typeof website !== 'string' || !website.trim()) return null
  return (
    website
      .trim()
      .toLowerCase()
      .replace(/^[a-z]+:\/\//, '')
      .split('/')[0]
      .split(':')[0]
      .replace(/^www\./, '') || null
  )
}

/**
 * Duplicate lookup. Throws on transport/HTTP errors — callers decide
 * whether that is fatal (reviewer stamping degrades; SSO fails open).
 */
export async function lookupVendorDuplicates(params: {
  email?: string
  domain?: string
  teseTenantId?: string
}): Promise<ClaimsLookupResult> {
  const search = new URLSearchParams()
  if (params.email) search.set('email', params.email)
  if (params.domain) search.set('domain', params.domain)
  if (params.teseTenantId) search.set('tenant_id', params.teseTenantId)

  const response = await fetch(
    `${baseUrl()}/api/v3/marketplace/vendor-claims/lookup?${search.toString()}`,
    {
      headers: { 'X-API-Key': apiKey() },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs()),
    }
  )

  const json = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  if (!response.ok) {
    throw new Error(
      String(json?.error || `vendor-claims lookup returned ${response.status}`)
    )
  }

  return {
    domain: (json.domain as string) ?? null,
    domain_usable: Boolean(json.domain_usable),
    reason: (json.reason as string) ?? null,
    candidate: (json.candidate as ClaimsCandidate) ?? null,
    tenants: Array.isArray(json.tenants)
      ? (json.tenants as ClaimsTenantMatch[])
      : [],
  }
}

/**
 * Report that a seller store now exists for a vendor. Best-effort by
 * contract: NEVER throws — a candidate bookkeeping failure must not
 * fail store creation. A 409 (candidate already linked to a DIFFERENT
 * seller) is returned as { conflict: true } so callers can log the
 * duplicate loudly.
 */
export async function notifySellerLinked(params: {
  domain?: string | null
  teseTenantId?: string | null
  sellerId: string
  sellerHandle?: string | null
  via: 'seller_create' | 'seller_claim'
}): Promise<{ ok: boolean; conflict?: boolean; error?: string }> {
  if (!isVendorClaimsConfigured()) {
    return { ok: false, error: 'vendor-claims not configured' }
  }
  try {
    const response = await fetch(
      `${baseUrl()}/api/v3/marketplace/vendor-claims/seller-linked`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: params.domain || undefined,
          tese_tenant_id: params.teseTenantId || undefined,
          seller_id: params.sellerId,
          seller_handle: params.sellerHandle || undefined,
          via: params.via,
        }),
        signal: AbortSignal.timeout(timeoutMs()),
      }
    )
    if (response.status === 409) {
      const json = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >
      return { ok: false, conflict: true, error: String(json?.error || '409') }
    }
    if (!response.ok) {
      return { ok: false, error: `seller-linked returned ${response.status}` }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
