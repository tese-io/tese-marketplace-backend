import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'

import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import { presignPrivateRead } from '../../../../shared/utils/r2-upload'
import {
  isBusinessOcrConfigured,
  prefillBusinessDocument
} from '../../../../utils/tese-business-ocr'

import { VendorPrefillBusinessVerificationType } from '../validators'

/**
 * @oas [post] /vendor/business-verification/prefill
 * operationId: "VendorPrefillBusinessVerification"
 * summary: "Read legal name / registration number / country off an uploaded document (OCR pre-fill, best-effort)"
 * description: >
 *   Pre-fill only — never a verification. Returns { prefill: null } when the
 *   OCR service is unconfigured, unreachable, or found nothing; the vendor
 *   types the fields. The document is exposed to the OCR service through a
 *   short-lived signed link (G-12).
 * x-authenticated: true
 * tags:
 *   - Vendor Business Verification
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<VendorPrefillBusinessVerificationType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  if (!isBusinessOcrConfigured()) {
    res.status(200).json({ prefill: null, available: false })
    return
  }
  const { document_key, mime_type } = req.validatedBody
  let imageUrl: string
  try {
    // 2 minutes: long enough for the OCR round-trip, short enough to be a
    // one-shot capability.
    imageUrl = await presignPrivateRead(document_key, 120)
  } catch {
    res.status(200).json({ prefill: null, available: false })
    return
  }
  const prefill = await prefillBusinessDocument({
    imageUrl,
    mimeType: mime_type ?? null,
    sellerId: seller.id
  })
  res.status(200).json({ prefill, available: true })
}
