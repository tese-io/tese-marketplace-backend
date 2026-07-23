import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError, Modules } from '@medusajs/framework/utils'

import { IntermediateEvents } from '@mercurjs/framework'

import {
  SELLER_CERTIFICATIONS_MODULE,
  SellerCertificationsModuleService
} from '../../../../../modules/seller-certifications'

import { AdminVerifySellerCertificationType } from '../../validators'

/**
 * @oas [post] /admin/seller-certifications/{id}/verify
 * operationId: "AdminVerifySellerCertification"
 * summary: "Approve or reject an attached seller certification"
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminVerifySellerCertification"
 * tags:
 *   - Admin Seller Certifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminVerifySellerCertificationType>,
  res: MedusaResponse
) => {
  const service: SellerCertificationsModuleService = req.scope.resolve(
    SELLER_CERTIFICATIONS_MODULE
  )
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)

  const existing = await service.listSellerCertifications({
    id: req.params.id
  })
  if (existing.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Seller certification not found'
    )
  }

  const { decision, notes, verified_by } = req.validatedBody

  const nextStatus = decision === 'approve' ? 'verified' : 'rejected'

  const [updated] = await service.updateSellerCertifications({
    selector: { id: existing[0].id },
    data: {
      verification_status: nextStatus,
      verified_by,
      verified_at: new Date(),
      verification_notes: notes ?? null
    }
  })

  await eventBus.emit({
    name: IntermediateEvents.SELLER_CERTIFICATION_CHANGED,
    data: { id: existing[0].id, seller_id: existing[0].seller_id }
  })

  res.status(200).json({ seller_certification: updated })
}
