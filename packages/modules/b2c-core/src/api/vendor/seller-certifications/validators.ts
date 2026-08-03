import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetSellerCertificationsParamsType = z.infer<
  typeof VendorGetSellerCertificationsParams
>

export const VendorGetSellerCertificationsParams = createFindParams({
  limit: 50,
  offset: 0
}).merge(
  z.object({
    verification_status: z
      .enum(['pending', 'verified', 'rejected', 'expired'])
      .optional()
  })
)

/**
 * @schema VendorAttachSellerCertification
 * type: object
 * required:
 *   - certification_slug
 *   - document_url
 * properties:
 *   certification_slug:
 *     type: string
 *     description: Slug of the certification from the shared catalogue
 *   document_url:
 *     type: string
 *     format: uri
 *     description: URL of the uploaded certificate document (PDF/image). Required — the admin verifier cannot approve a cert without evidence.
 *   expires_at:
 *     type: string
 *     format: date-time
 *     nullable: true
 *     description: Certification expiry date
 */
export type VendorAttachSellerCertificationType = z.infer<
  typeof VendorAttachSellerCertification
>
export const VendorAttachSellerCertification = z.object({
  certification_slug: z.string().min(1),
  // Required: the admin verifier cannot approve a cert without evidence.
  // Vendor panel enforces at the UI level; this is the defensive layer.
  document_url: z.string().url({ message: 'A proof document URL is required' }),
  expires_at: z.coerce.date().nullish()
})
