import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import sellerProductLink from '../../../../links/seller-product'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import {
  fetchProductCoverage,
  fetchSellerCoverage,
  isVendorCoverageConfigured,
} from '../../../../utils/tese-vendor-coverage'

/**
 * GET /vendor/coverage/all
 *
 * Consolidated coverage view for the vendor-panel Settings → Coverage
 * Overview page. Unions three sources into one list:
 *
 *   1. Seller-level self-declared / admin-curated / ai-classified rows
 *      (what the vendor sees today in "Activities I serve")
 *   2. Product-level ai-classified / admin-curated rows — enriched with
 *      the originating product's title so the vendor knows WHICH product
 *      caused the surfacing
 *
 * Read-only. Sellers already have Add / Remove endpoints for the
 * seller-level self-declared bucket at /vendor/coverage; this endpoint
 * is purely for visibility. Product-level classifications are managed
 * by editing the product itself (which re-fires the classifier) or by
 * an admin action in the coverage review queue.
 *
 * Response shape:
 *   {
 *     rows: [
 *       {
 *         subject_kind: 'seller' | 'product',
 *         product_id: string | null,
 *         product_title: string | null,
 *         activity_code: string,
 *         source: string,
 *         confidence: number,
 *         coverage_kind: 'DIRECT' | 'INDIRECT',
 *         is_active: boolean,
 *         _id?: string,
 *       },
 *       ...
 *     ],
 *     count: number
 *   }
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!isVendorCoverageConfigured()) {
    return res.status(503).json({
      message: 'Vendor coverage not configured (TESE_BACKEND_API_KEY)',
      rows: [],
    })
  }

  try {
    const seller = await fetchSellerByAuthActorId(
      req.auth_context.actor_id,
      req.scope
    )

    // 1) Seller-level rows — what "Activities I serve" already shows.
    const sellerRowsPromise = fetchSellerCoverage(seller.id)

    // 2) Product-level rows — one lookup per product. Sellers typically
    //    have well under 100 products; fan-out is safe and simpler than
    //    adding a bulk endpoint on tese-backend. If a specific product
    //    lookup fails we log + skip it rather than fail the whole page.
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: sellerProducts } = await query.graph({
      entity: sellerProductLink.entryPoint,
      fields: ['product.id', 'product.title'],
      filters: {
        seller_id: seller.id,
        deleted_at: { $eq: null },
      },
    })

    const products = (
      sellerProducts as Array<{ product?: { id?: string; title?: string } }>
    )
      .map((sp) => sp?.product)
      .filter((p): p is { id: string; title?: string } => Boolean(p?.id))

    const productCoveragePromises = products.map(async (p) => {
      try {
        const rows = await fetchProductCoverage(p.id)
        return rows.map((r) => ({
          ...r,
          product_id: p.id,
          product_title: p.title || null,
        }))
      } catch (err) {
        logger.warn(
          `Vendor coverage /all: product ${p.id} lookup failed, skipping. ${
            err instanceof Error ? err.message : String(err)
          }`
        )
        return []
      }
    })

    const [sellerRows, ...productRowGroups] = await Promise.all([
      sellerRowsPromise,
      ...productCoveragePromises,
    ])

    const shapedSellerRows = sellerRows.map((r) => ({
      _id: r._id,
      subject_kind: 'seller' as const,
      product_id: null,
      product_title: null,
      activity_code: r.activity_code,
      source: r.source,
      confidence: r.confidence,
      coverage_kind: r.coverage_kind,
      is_active: r.is_active,
    }))

    const shapedProductRows = productRowGroups.flat().map((r: any) => ({
      _id: r._id,
      subject_kind: 'product' as const,
      product_id: r.product_id as string,
      product_title: r.product_title as string | null,
      activity_code: r.activity_code,
      source: r.source,
      confidence: r.confidence,
      coverage_kind: r.coverage_kind,
      is_active: r.is_active,
    }))

    const rows = [...shapedSellerRows, ...shapedProductRows]

    return res.json({ rows, count: rows.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Vendor coverage /all fetch failed'
    logger.error(`Vendor coverage GET /all: ${message}`)
    return res.status(502).json({ message, rows: [] })
  }
}
