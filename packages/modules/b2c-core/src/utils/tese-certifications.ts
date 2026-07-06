/**
 * Read-through client for the shared sustainability certifications catalogue
 * hosted by tese-backend (/api/v3/certifications, Mongo + R2 logos).
 *
 * Source of truth stays in tese-backend; the marketplace only reads. Responses
 * are cached in-memory (default 10 min) since this is slow-moving reference
 * data consumed by vendor pickers and storefront display.
 *
 * Env: TESE_BACKEND_URL, TESE_BACKEND_API_KEY (service API key minted in
 * tese-backend s-admin → API keys).
 */

const TESE_BACKEND_URL = (
  process.env.TESE_BACKEND_URL || 'http://localhost:8000'
).replace(/\/$/, '')

const TESE_BACKEND_API_KEY = process.env.TESE_BACKEND_API_KEY || ''

const CACHE_TTL_MS = Number(process.env.CERTIFICATIONS_CACHE_TTL_MS || 10 * 60 * 1000)

export type CatalogueCertification = {
  slug: string
  name: string
  description: string
  categories: string[]
  websiteUrl: string | null
  logoUrl: string | null
  aliases: string[]
}

type CacheEntry = { at: number; data: CatalogueCertification[] }

const cache = new Map<string, CacheEntry>()

export const isCertificationsCatalogueConfigured = () => Boolean(TESE_BACKEND_API_KEY)

/**
 * Fetch active certifications from the catalogue, optionally filtered.
 * Throws on transport errors; callers translate to HTTP responses.
 */
export async function fetchCertificationsCatalogue(params: {
  q?: string
  category?: string
} = {}): Promise<CatalogueCertification[]> {
  const search = new URLSearchParams({ size: '200' })
  if (params.q) search.set('q', params.q)
  if (params.category) search.set('category', params.category)
  const cacheKey = search.toString()

  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data
  }

  const response = await fetch(
    `${TESE_BACKEND_URL}/api/v3/certifications?${cacheKey}`,
    {
      headers: { 'X-API-Key': TESE_BACKEND_API_KEY },
      cache: 'no-store',
    }
  )

  const json = (await response.json().catch(() => ({}))) as {
    status?: boolean
    msg?: string
    data?: { certifications?: Record<string, unknown>[] }
  }

  if (!response.ok || !json?.status) {
    throw new Error(json?.msg || `Certifications catalogue returned ${response.status}`)
  }

  const certifications: CatalogueCertification[] = (
    json.data?.certifications || []
  ).map((c) => ({
    slug: String(c.slug),
    name: String(c.name),
    description: String(c.description || ''),
    categories: Array.isArray(c.categories) ? c.categories.map(String) : [],
    websiteUrl: c.websiteUrl ? String(c.websiteUrl) : null,
    logoUrl: c.logoUrl ? String(c.logoUrl) : null,
    aliases: Array.isArray(c.aliases) ? c.aliases.map(String) : [],
  }))

  cache.set(cacheKey, { at: Date.now(), data: certifications })
  return certifications
}
