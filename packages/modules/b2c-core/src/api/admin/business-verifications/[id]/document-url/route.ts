import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  SELLER_VERIFICATIONS_MODULE,
  SellerVerificationsModuleService
} from '../../../../../modules/seller-verifications'
import {
  PRIVATE_READ_TTL_SECONDS,
  presignPrivateRead
} from '../../../../../shared/utils/r2-upload'
import { isPrivateUploadKey } from '../../../../../utils/business-verification'

/**
 * @oas [get] /admin/business-verifications/{id}/document-url
 * operationId: "AdminGetBusinessVerificationDocumentUrl"
 * summary: "Short-lived signed link to the submitted document (G-12)"
 * x-authenticated: true
 * tags:
 *   - Admin Business Verifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: SellerVerificationsModuleService = req.scope.resolve(
    SELLER_VERIFICATIONS_MODULE
  )
  const [row] = await service.listSellerVerifications({ id: req.params.id })
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Business verification not found')
  }
  // Only the key stored on THIS record is ever signed — the endpoint can
  // never be pointed at an arbitrary object.
  if (!isPrivateUploadKey(row.document_key)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'No document on file')
  }
  const url = await presignPrivateRead(row.document_key)
  res.status(200).json({ url, expires_in: PRIVATE_READ_TTL_SECONDS })
}
