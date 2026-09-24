import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

import {
  SELLER_VERIFICATIONS_MODULE,
  SellerVerificationsModuleService
} from '../../../modules/seller-verifications'

import { loadSellerSummaries } from './helpers'
import { AdminGetBusinessVerificationsParamsType } from './validators'

/**
 * @oas [get] /admin/business-verifications
 * operationId: "AdminListBusinessVerifications"
 * summary: "Business verification review queue (B-25)"
 * x-authenticated: true
 * tags:
 *   - Admin Business Verifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: MedusaRequest<AdminGetBusinessVerificationsParamsType>,
  res: MedusaResponse
) => {
  const service: SellerVerificationsModuleService = req.scope.resolve(
    SELLER_VERIFICATIONS_MODULE
  )
  const filters: Record<string, unknown> = {}
  if (typeof req.query.status === 'string') filters.status = req.query.status
  if (typeof req.query.seller_id === 'string') filters.seller_id = req.query.seller_id

  const take = req.queryConfig?.pagination?.take ?? 50
  const skip = req.queryConfig?.pagination?.skip ?? 0

  const [rows, count] = await service.listAndCountSellerVerifications(filters, {
    take,
    skip,
    order: { created_at: 'DESC' }
  })

  const sellers = await loadSellerSummaries(
    req.scope,
    Array.from(new Set(rows.map((r) => r.seller_id)))
  )

  res.status(200).json({
    business_verifications: rows.map((r) => ({
      ...r,
      seller: sellers.get(r.seller_id) ?? null
    })),
    count,
    offset: skip,
    limit: take
  })
}
