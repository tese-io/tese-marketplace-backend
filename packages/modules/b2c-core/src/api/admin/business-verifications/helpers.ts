import { MedusaContainer } from '@medusajs/framework'

import { SELLER_MODULE } from '../../../modules/seller'
import {
  scanSellersByDomain,
  scanSellersByLegalName,
  type SellerScanHit
} from '../../../utils/seller-duplicate-scan'
import {
  extractEmailDomain,
  extractWebsiteHost,
  isVendorClaimsConfigured,
  lookupVendorDuplicates,
  type ClaimsCandidate,
  type ClaimsTenantMatch
} from '../../../utils/tese-vendor-claims'

export type SellerSummary = {
  id: string
  name: string | null
  handle: string | null
  email: string | null
  website: string | null
  store_status?: string | null
}

export type VerificationDuplicateSignals = {
  checked_at: string
  status?: 'unavailable'
  error?: string
  domain?: string | null
  domain_usable?: boolean
  candidate?: ClaimsCandidate | null
  tenants?: ClaimsTenantMatch[]
  sellers: SellerScanHit[]
}

export async function loadSellerSummaries(
  container: MedusaContainer,
  ids: string[]
): Promise<Map<string, SellerSummary>> {
  const out = new Map<string, SellerSummary>()
  if (!ids.length) return out
  const sellerService: any = container.resolve(SELLER_MODULE)
  const rows: SellerSummary[] = await sellerService.listSellers(
    { id: ids },
    { select: ['id', 'name', 'handle', 'email', 'website', 'store_status'] }
  )
  for (const s of rows || []) out.set(s.id, s)
  return out
}

/**
 * B-25: everything already known that might be the same company —
 * the platform's candidate/organisation lookup by the seller's canonical
 * domain, plus this marketplace's own sellers by domain AND by legal name.
 * Best-effort: a lookup failure reports `unavailable`, never throws.
 */
export async function computeDuplicateSignals(
  container: MedusaContainer,
  input: { seller: SellerSummary; legal_name: string }
): Promise<VerificationDuplicateSignals> {
  const checked_at = new Date().toISOString()
  const sellerService: any = container.resolve(SELLER_MODULE)
  const exclude = { excludeSellerId: input.seller.id }

  let byName: SellerScanHit[] = []
  try {
    byName = await scanSellersByLegalName(sellerService, input.legal_name, exclude)
  } catch {
    byName = []
  }

  if (!isVendorClaimsConfigured()) {
    return {
      checked_at,
      status: 'unavailable',
      error: 'TESE_BACKEND_API_KEY not configured',
      sellers: byName
    }
  }

  try {
    const lookup = await lookupVendorDuplicates(
      input.seller.email
        ? { email: input.seller.email }
        : { domain: extractWebsiteHost(input.seller.website) || undefined }
    )
    const byDomain =
      lookup.domain_usable && lookup.domain
        ? await scanSellersByDomain(sellerService, lookup.domain, exclude)
        : []
    const seen = new Set(byDomain.map((s) => s.id))
    return {
      checked_at,
      domain: lookup.domain ?? extractEmailDomain(input.seller.email),
      domain_usable: lookup.domain_usable,
      candidate: lookup.candidate,
      tenants: lookup.tenants,
      sellers: [...byDomain, ...byName.filter((s) => !seen.has(s.id))]
    }
  } catch (error) {
    return {
      checked_at,
      status: 'unavailable',
      error: error instanceof Error ? error.message : String(error),
      sellers: byName
    }
  }
}
