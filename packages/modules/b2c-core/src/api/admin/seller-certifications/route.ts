import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

import {
  SELLER_CERTIFICATIONS_MODULE,
  SellerCertificationsModuleService
} from '../../../modules/seller-certifications'

import { AdminGetSellerCertificationsParamsType } from './validators'

/**
 * @oas [get] /admin/seller-certifications
 * operationId: "AdminListSellerCertifications"
 * summary: "List seller-attached certifications (admin verification queue)"
 * x-authenticated: true
 * tags:
 *   - Admin Seller Certifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: MedusaRequest<AdminGetSellerCertificationsParamsType>,
  res: MedusaResponse
) => {
  const service: SellerCertificationsModuleService = req.scope.resolve(
    SELLER_CERTIFICATIONS_MODULE
  )

  const filters: Record<string, unknown> = {}
  const q = req.query
  if (typeof q.verification_status === 'string') {
    filters.verification_status = q.verification_status
  }
  if (typeof q.seller_id === 'string') {
    filters.seller_id = q.seller_id
  }
  if (typeof q.certification_slug === 'string') {
    filters.certification_slug = q.certification_slug
  }

  const take = req.queryConfig?.pagination?.take ?? 50
  const skip = req.queryConfig?.pagination?.skip ?? 0

  const [rows, count] = await service.listAndCountSellerCertifications(
    filters,
    {
      take,
      skip,
      order: { created_at: 'ASC' }
    }
  )

  res.status(200).json({
    seller_certifications: rows,
    count,
    offset: skip,
    limit: take
  })
}
