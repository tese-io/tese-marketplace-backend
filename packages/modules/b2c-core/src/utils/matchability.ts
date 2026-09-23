/**
 * B-09 — "How buyers find you": the seller-facing matchability score.
 *
 * D3: the widget must show exactly what matching sees, so the signals
 * are gathered with the SAME graph queries marketplace-catalog-sync
 * uses for its seller enrichment (warehouse geo, ship-to zones,
 * verified certifications, contact email) — no client-side drift.
 *
 * Scoring is deliberately simple and documented: fixed weights per
 * signal, percentage signals scale their weight, unknown signals
 * (a source being unreachable) drop out of the denominator instead of
 * counting against the vendor.
 */

import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { normalizeSellerContactEmail } from './marketplace-catalog-sync'
import {
  fetchSellerCoverage,
  isVendorCoverageConfigured,
} from './tese-vendor-coverage'

export type MatchabilitySignals = {
  products: { count: number }
  images: { withImage: number; total: number }
  prices: { priced: number; total: number }
  contact_email: boolean
  geo: boolean
  ship_to: boolean
  /** Active self-declared/classified coverage rows; null = unavailable. */
  coverage: { count: number | null }
  certifications: { verified: number }
  tese_verified: boolean
}

export type SignalStatus = 'ok' | 'partial' | 'missing' | 'unknown'

export type MatchabilitySignalWire = {
  key:
    | 'coverage'
    | 'geo'
    | 'contact_email'
    | 'prices'
    | 'products'
    | 'images'
    | 'ship_to'
    | 'certifications'
  status: SignalStatus
  /** For percentage signals. */
  detail?: { done: number; total: number }
}

export type MatchabilityWire = {
  score: number
  tese_verified: boolean
  signals: MatchabilitySignalWire[]
}

// Weights sum to 100. The D-04 four carry the most weight — they are
// what the recommender's retrieval + cards actually run on.
const WEIGHTS = {
  coverage: 20,
  geo: 15,
  contact_email: 15,
  prices: 15,
  products: 10,
  images: 10,
  ship_to: 10,
  certifications: 5,
} as const

function ratio(done: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, done / total))
}

export function computeMatchability(
  signals: MatchabilitySignals
): MatchabilityWire {
  const wire: MatchabilitySignalWire[] = []
  let earned = 0
  let possible = 0

  const push = (
    key: MatchabilitySignalWire['key'],
    fraction: number | null,
    detail?: { done: number; total: number }
  ) => {
    const weight = WEIGHTS[key]
    if (fraction === null) {
      wire.push({ key, status: 'unknown' })
      return
    }
    possible += weight
    earned += weight * fraction
    const status: SignalStatus =
      fraction >= 1 ? 'ok' : fraction > 0 ? 'partial' : 'missing'
    wire.push({ key, status, ...(detail ? { detail } : {}) })
  }

  push(
    'coverage',
    signals.coverage.count === null ? null : signals.coverage.count > 0 ? 1 : 0
  )
  push('geo', signals.geo ? 1 : 0)
  push('contact_email', signals.contact_email ? 1 : 0)
  push('prices', ratio(signals.prices.priced, signals.prices.total), {
    done: signals.prices.priced,
    total: signals.prices.total,
  })
  push('products', signals.products.count > 0 ? 1 : 0)
  push('images', ratio(signals.images.withImage, signals.images.total), {
    done: signals.images.withImage,
    total: signals.images.total,
  })
  push('ship_to', signals.ship_to ? 1 : 0)
  push('certifications', signals.certifications.verified > 0 ? 1 : 0)

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100)

  return { score, tese_verified: signals.tese_verified, signals: wire }
}

const PRODUCT_SAMPLE_LIMIT = 100

export async function gatherMatchabilitySignals(
  scope: { resolve: (key: string) => any },
  sellerId: string,
  sellerProductLinkEntryPoint: string
): Promise<MatchabilitySignals> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  // Seller-level: email, badge, warehouse geo, ship-to zones, certs —
  // same field shapes as marketplace-catalog-sync's enrichment.
  const {
    data: [seller],
  } = await query.graph({
    entity: 'seller',
    fields: [
      'email',
      'is_verified',
      'stock_locations.stock_location_geo.latitude',
      'stock_locations.stock_location_geo.longitude',
      'shipping_options.service_zone.geo_zones.country_code',
      'seller_certifications.verification_status',
      'seller_certifications.expires_at',
    ],
    filters: { id: sellerId },
  })

  const contactEmail = normalizeSellerContactEmail(seller?.email)
  const geo = (seller?.stock_locations || []).some(
    (sl: { stock_location_geo?: { latitude?: number; longitude?: number } }) => {
      const g = sl?.stock_location_geo
      return g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)
    }
  )
  const shipTo = (seller?.shipping_options || []).some(
    (opt: { service_zone?: { geo_zones?: Array<{ country_code?: string }> } }) =>
      (opt?.service_zone?.geo_zones || []).some((gz) => gz?.country_code)
  )
  const now = Date.now()
  const verifiedCerts = (seller?.seller_certifications || []).filter(
    (c: { verification_status?: string; expires_at?: string }) => {
      if (c?.verification_status !== 'verified') return false
      if (c?.expires_at) {
        const ms = new Date(c.expires_at).getTime()
        if (Number.isFinite(ms) && ms < now) return false
      }
      return true
    }
  ).length

  // Product-level: sampled, matching the checklist's first-100 cap.
  const { data: links } = await query.graph({
    entity: sellerProductLinkEntryPoint,
    fields: ['product.id'],
    filters: { seller_id: sellerId, deleted_at: { $eq: null } },
  })
  const productIds = (links as Array<{ product?: { id?: string } }>)
    .map((l) => l?.product?.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, PRODUCT_SAMPLE_LIMIT)

  let withImage = 0
  let priced = 0
  if (productIds.length) {
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id', 'thumbnail', 'images.id', 'variants.prices.amount'],
      filters: { id: productIds },
    })
    for (const p of products || []) {
      if (p?.thumbnail || (p?.images || []).length > 0) withImage += 1
      const hasPrice = (p?.variants || []).some(
        (v: { prices?: Array<{ amount?: number | string }> }) =>
          (v?.prices || []).some((pr) => {
            const amount = Number(pr?.amount)
            return Number.isFinite(amount) && amount > 0
          })
      )
      if (hasPrice) priced += 1
    }
  }

  // Coverage — same source the recommender's bucketing reads.
  let coverageCount: number | null = null
  if (isVendorCoverageConfigured()) {
    try {
      const rows = await fetchSellerCoverage(sellerId)
      coverageCount = (rows || []).filter((r) => r.is_active !== false).length
    } catch {
      coverageCount = null
    }
  }

  return {
    products: { count: productIds.length },
    images: { withImage, total: productIds.length },
    prices: { priced, total: productIds.length },
    contact_email: Boolean(contactEmail),
    geo,
    ship_to: shipTo,
    coverage: { count: coverageCount },
    certifications: { verified: verifiedCerts },
    tese_verified: Boolean(seller?.is_verified),
  }
}
