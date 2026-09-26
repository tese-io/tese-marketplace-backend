import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  SELLER_VERIFICATIONS_MODULE,
  SellerVerificationsModuleService
} from '../../../../modules/seller-verifications'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import {
  PRIVATE_READ_TTL_SECONDS,
  presignPrivateRead
} from '../../../../shared/utils/r2-upload'
import {
  deriveBusinessVerificationState,
  isPrivateUploadKey
} from '../../../../utils/business-verification'

/**
 * @oas [get] /vendor/business-verification/document-url
 * operationId: "VendorGetBusinessVerificationDocumentUrl"
 * summary: "Short-lived signed link to the seller's own current document (G-12)"
 * x-authenticated: true
 * tags:
 *   - Vendor Business Verification
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const service: SellerVerificationsModuleService = req.scope.resolve(
    SELLER_VERIFICATIONS_MODULE
  )
  const rows = await service.listSellerVerifications(
    { seller_id: seller.id },
    { order: { created_at: 'DESC' }, take: 50 }
  )
  const { current } = deriveBusinessVerificationState(rows)
  if (current?.document_purged_at) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'This document was deleted under the retention policy'
    )
  }
  if (!current || !isPrivateUploadKey(current.document_key)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'No document on file')
  }
  const url = await presignPrivateRead(current.document_key)
  res.status(200).json({ url, expires_in: PRIVATE_READ_TTL_SECONDS })
}
