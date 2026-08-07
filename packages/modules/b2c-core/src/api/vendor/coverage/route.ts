import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import {
  deactivateSellerCoverage,
  fetchSellerCoverage,
  isVendorCoverageConfigured,
  upsertSellerCoverage,
} from '../../../utils/tese-vendor-coverage'

/**
 * Seller-facing coverage endpoints (P3.3/P3.4). Sellers manage their
 * "Activities I serve" list from the vendor-panel.
 *
 * The seller identity always comes from the authenticated Medusa actor —
 * a compromised UI cannot write coverage for a different seller.
 */

// ─────────────────────────────────────────────────────────────────────
// GET /vendor/coverage
// List the current seller's active coverage rows.
// ─────────────────────────────────────────────────────────────────────
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
    const rows = await fetchSellerCoverage(seller.id)
    return res.json({ rows, count: rows.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Vendor coverage fetch failed'
    logger.error(`Vendor coverage GET: ${message}`)
    return res.status(502).json({ message, rows: [] })
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST /vendor/coverage
// Body: { activity_code: string }
// Adds one activity code to the seller's coverage.
// ─────────────────────────────────────────────────────────────────────
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!isVendorCoverageConfigured()) {
    return res.status(503).json({ message: 'Vendor coverage not configured' })
  }

  const body = (req.body as { activity_code?: string }) || {}
  const rawCode =
    typeof body.activity_code === 'string' ? body.activity_code.trim() : ''
  if (!rawCode) {
    return res.status(400).json({ message: 'activity_code is required' })
  }

  try {
    const seller = await fetchSellerByAuthActorId(
      req.auth_context.actor_id,
      req.scope
    )
    const result = await upsertSellerCoverage(seller.id, rawCode)
    return res.status(result.created ? 201 : 200).json(result)
  } catch (e: any) {
    const status = e?.status || 502
    const errorCode = e?.error_code
    // Surface 400 / 404 / 410 from tese-backend as-is so the UI can show
    // the exact reason (e.g. "That code doesn't exist" / "That code is deprecated").
    const passThroughStatus = [400, 404, 410].includes(status) ? status : 502
    logger.error(`Vendor coverage POST: ${e?.message}`)
    return res.status(passThroughStatus).json({
      message: e?.message || 'Vendor coverage add failed',
      code: errorCode || null,
      replaced_by: e?.replaced_by || null,
    })
  }
}
