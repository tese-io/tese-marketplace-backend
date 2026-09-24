import { normalizeLegalName } from './business-verification'
import { extractEmailDomain, extractWebsiteHost } from './tese-vendor-claims'

/**
 * Local seller scans used to SURFACE "this company may already exist" to a
 * human reviewer (seller applications, business verification). Data
 * access only — the canonical domain always comes from tese-backend so
 * both systems match on the same key (G-05: one matcher). Never used to
 * auto-merge anything.
 */

export type SellerScanHit = {
  id: string
  name: string
  handle: string
  matched_on: 'seller_email_domain' | 'seller_website' | 'seller_legal_name'
}

type SellerLike = {
  id: string
  name?: string | null
  handle?: string | null
  email?: string | null
  website?: string | null
}

type SellerLister = {
  listSellers: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<SellerLike[]>
}

const SELECT = ['id', 'name', 'handle', 'email', 'website']

export async function scanSellersByDomain(
  sellerService: SellerLister,
  domain: string | null | undefined,
  options: { excludeSellerId?: string } = {}
): Promise<SellerScanHit[]> {
  if (!domain) return []
  const all = await sellerService.listSellers({}, { select: SELECT, take: 1000 })
  const hits: SellerScanHit[] = []
  for (const s of all || []) {
    if (options.excludeSellerId && s.id === options.excludeSellerId) continue
    if (extractEmailDomain(s.email) === domain) {
      hits.push({ id: s.id, name: s.name || '', handle: s.handle || '', matched_on: 'seller_email_domain' })
    } else if (extractWebsiteHost(s.website) === domain) {
      hits.push({ id: s.id, name: s.name || '', handle: s.handle || '', matched_on: 'seller_website' })
    }
  }
  return hits
}

export async function scanSellersByLegalName(
  sellerService: SellerLister,
  legalName: string | null | undefined,
  options: { excludeSellerId?: string } = {}
): Promise<SellerScanHit[]> {
  const key = normalizeLegalName(legalName)
  if (!key) return []
  const all = await sellerService.listSellers({}, { select: SELECT, take: 1000 })
  const hits: SellerScanHit[] = []
  for (const s of all || []) {
    if (options.excludeSellerId && s.id === options.excludeSellerId) continue
    if (normalizeLegalName(s.name) === key) {
      hits.push({ id: s.id, name: s.name || '', handle: s.handle || '', matched_on: 'seller_legal_name' })
    }
  }
  return hits
}
