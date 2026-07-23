import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { MedusaError, Modules } from '@medusajs/framework/utils'

import { IntermediateEvents } from '@mercurjs/framework'

import {
  SELLER_CERTIFICATIONS_MODULE,
  SellerCertificationsModuleService
} from '../../../../modules/seller-certifications'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'

/**
 * @oas [delete] /vendor/seller-certifications/{id}
 * operationId: "VendorRemoveSellerCertification"
 * summary: "Remove an attached certification"
 * x-authenticated: true
 * tags:
 *   - Vendor Seller Certifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )
  const service: SellerCertificationsModuleService = req.scope.resolve(
    SELLER_CERTIFICATIONS_MODULE
  )
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)

  const existing = await service.listSellerCertifications({
    id: req.params.id
  })
  if (existing.length === 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Certification not found')
  }
  if (existing[0].seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Not allowed to remove another seller\'s certification'
    )
  }

  await service.softDeleteSellerCertifications([existing[0].id])

  await eventBus.emit({
    name: IntermediateEvents.SELLER_CERTIFICATION_CHANGED,
    data: { id: existing[0].id, seller_id: seller.id }
  })

  res.status(200).json({
    id: existing[0].id,
    object: 'seller_certification',
    deleted: true
  })
}
