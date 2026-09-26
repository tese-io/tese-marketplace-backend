import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  SELLER_CERTIFICATIONS_MODULE,
  SellerCertificationsModuleService
} from '../../../../../modules/seller-certifications'
import { fetchSellerByAuthActorId } from '../../../../../shared/infra/http/utils'
import {
  PRIVATE_READ_TTL_SECONDS,
  presignPrivateRead,
  privateKeyFromStoredUrl
} from '../../../../../shared/utils/r2-upload'
import { isPrivateUploadKey } from '../../../../../utils/business-verification'
import { documentsOf, parseDocumentIndex } from '../../../../../utils/certification-documents'

/**
 * @oas [get] /vendor/seller-certifications/{id}/document-url
 * operationId: "VendorGetSellerCertificationDocumentUrl"
 * summary: "Short-lived signed link to one of the seller's own proof documents (G-12)"
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     schema: { type: string }
 *   - in: query
 *     name: index
 *     schema: { type: integer, default: 0 }
 * tags:
 *   - Vendor Seller Certifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const service: SellerCertificationsModuleService = req.scope.resolve(
    SELLER_CERTIFICATIONS_MODULE
  )
  const [row] = await service.listSellerCertifications({
    id: req.params.id,
    seller_id: seller.id
  })
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Seller certification not found')
  }
  const doc = documentsOf(row)[parseDocumentIndex(req.query.index)]
  if (!doc?.url) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Document not found')
  }
  const key = privateKeyFromStoredUrl(doc.url)
  if (!key || !isPrivateUploadKey(key)) {
    res.status(200).json({ url: doc.url, signed: false })
    return
  }
  const url = await presignPrivateRead(key)
  res.status(200).json({ url, signed: true, expires_in: PRIVATE_READ_TTL_SECONDS })
}
