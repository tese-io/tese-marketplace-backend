/**
 * D-04 — the vendor-side completeness gate (Kuzi directive, DECIDED).
 *
 * A vendor missing any of the four signals cannot submit a product for
 * review: declared service activities, warehouse coordinates, a contact
 * email, and a price. The gate fires when a product tries to LEAVE
 * draft (proposed or published) — never on saving a draft, and it is
 * independent of D-01's admin review that follows.
 *
 * The panel pre-empts this in UI; this server check is the backstop
 * that makes the rule real.
 */

import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { SELLER_VERIFICATIONS_MODULE } from '../modules/seller-verifications'
import { isBusinessVerified } from './business-verification'
import { normalizeSellerContactEmail } from './marketplace-catalog-sync'
import {
  fetchSellerCoverage,
  isVendorCoverageConfigured,
} from './tese-vendor-coverage'

export type CompletenessField =
  | 'activities'
  | 'warehouse_coordinates'
  | 'contact_email'
  | 'price'
  | 'business_verification'

export type CompletenessSignals = {
  activityCount: number | null // null = coverage service unavailable
  hasWarehouseCoordinates: boolean
  contactEmail: string | null
  hasPrice: boolean
  // KYB (B-24, KYB-1a): a verified business registration document.
  // Applies to every seller from the moment it ships (B-28: existing
  // sellers keep published products, new submissions gate immediately).
  businessVerified: boolean
}

export type CompletenessResult = {
  ok: boolean
  missing: CompletenessField[]
}

export const FIELD_LABELS: Record<CompletenessField, string> = {
  activities: 'service activities',
  warehouse_coordinates: 'warehouse location',
  contact_email: 'contact email',
  price: 'product price',
  business_verification: 'business verification',
}

/** Machine-readable marker the panel parses out of the error message. */
export const INCOMPLETE_CODE = 'INCOMPLETE_SELLER_PROFILE'

/**
 * Pure decision: which of the four fields are missing.
 * activityCount === null (coverage service unreachable) fails OPEN for
 * that one signal — blocking every submission marketplace-wide on a
 * cross-service blip is a worse failure than letting one through; the
 * outage is logged loudly at the call site and the client-side gate
 * still applies.
 */
export function missingFields(signals: CompletenessSignals): CompletenessField[] {
  const missing: CompletenessField[] = []
  if (signals.activityCount !== null && signals.activityCount < 1) {
    missing.push('activities')
  }
  if (!signals.hasWarehouseCoordinates) {
    missing.push('warehouse_coordinates')
  }
  if (!signals.contactEmail) {
    missing.push('contact_email')
  }
  if (!signals.hasPrice) {
    missing.push('price')
  }
  if (!signals.businessVerified) {
    missing.push('business_verification')
  }
  return missing
}

/** ≥1 variant carrying ≥1 positive price. Works on the create payload
 *  shape ({ prices: [{ amount }] }) and the DB graph shape alike. */
export function hasPricedVariant(
  variants: Array<{ prices?: Array<{ amount?: number | string | null }> | null }> | null | undefined
): boolean {
  for (const variant of variants || []) {
    for (const price of variant?.prices || []) {
      const amount = Number(price?.amount)
      if (Number.isFinite(amount) && amount > 0) {
        return true
      }
    }
  }
  return false
}

export function formatIncompleteMessage(missing: CompletenessField[]): string {
  const labels = missing.map((f) => FIELD_LABELS[f]).join(', ')
  return (
    `Complete your seller profile before submitting: missing ${labels}. ` +
    `(${INCOMPLETE_CODE}:${missing.join(',')})`
  )
}

/**
 * Gather the live signals for a seller. Price comes either from the
 * create payload (`variantsPayload`) or from the stored product
 * (`productId`) — exactly one should be provided.
 */
export async function gatherCompletenessSignals(
  scope: { resolve: (key: string) => any },
  sellerId: string,
  opts: {
    productId?: string
    variantsPayload?: Array<{ prices?: Array<{ amount?: number | string | null }> | null }>
  }
): Promise<CompletenessSignals> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  // Contact email + warehouse coordinates in one seller read.
  const {
    data: [seller],
  } = await query.graph({
    entity: 'seller',
    fields: [
      'email',
      'stock_locations.id',
      'stock_locations.stock_location_geo.latitude',
      'stock_locations.stock_location_geo.longitude',
    ],
    filters: { id: sellerId },
  })

  const contactEmail = normalizeSellerContactEmail(seller?.email) ?? null
  const hasWarehouseCoordinates = (seller?.stock_locations || []).some(
    (sl: { stock_location_geo?: { latitude?: number; longitude?: number } }) => {
      const g = sl?.stock_location_geo
      return g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)
    }
  )

  // Declared activities — self-declared coverage rows in tese-backend.
  let activityCount: number | null = null
  if (isVendorCoverageConfigured()) {
    try {
      const rows = await fetchSellerCoverage(sellerId)
      activityCount = (rows || []).filter((r) => r.is_active !== false).length
    } catch (error) {
      console.error(
        '[seller-completeness] coverage service unreachable — activities check skipped (fails open):',
        error instanceof Error ? error.message : error
      )
      activityCount = null
    }
  } else {
    console.error(
      '[seller-completeness] TESE_BACKEND_API_KEY not configured — activities check skipped (fails open)'
    )
  }

  // Price — from the payload on create, from the DB on status change.
  let hasPrice: boolean
  if (opts.variantsPayload) {
    hasPrice = hasPricedVariant(opts.variantsPayload)
  } else if (opts.productId) {
    const {
      data: [product],
    } = await query.graph({
      entity: 'product',
      fields: ['variants.prices.amount'],
      filters: { id: opts.productId },
    })
    hasPrice = hasPricedVariant(product?.variants)
  } else {
    hasPrice = false
  }

  // Business verification — local module, same database as everything
  // else, so unlike the coverage signal this fails CLOSED: a lookup
  // failure never lets an unverified business submit.
  let businessVerified = false
  try {
    const verifications: any = scope.resolve(SELLER_VERIFICATIONS_MODULE)
    const rows = await verifications.listSellerVerifications(
      { seller_id: sellerId },
      { take: 50 }
    )
    businessVerified = isBusinessVerified(rows)
  } catch (error) {
    console.error(
      '[seller-completeness] business verification lookup failed — treating seller as unverified (fails closed):',
      error instanceof Error ? error.message : error
    )
  }

  return { activityCount, hasWarehouseCoordinates, contactEmail, hasPrice, businessVerified }
}

export async function checkSellerSubmissionCompleteness(
  scope: { resolve: (key: string) => any },
  sellerId: string,
  opts: {
    productId?: string
    variantsPayload?: Array<{ prices?: Array<{ amount?: number | string | null }> | null }>
    /** Bulk import: prices are validated PER ROW by the import
     *  validation, so the seller-level gate checks only the other
     *  three signals. */
    skipPrice?: boolean
  }
): Promise<CompletenessResult> {
  const signals = await gatherCompletenessSignals(scope, sellerId, opts)
  if (opts.skipPrice) {
    signals.hasPrice = true
  }
  const missing = missingFields(signals)
  return { ok: missing.length === 0, missing }
}
