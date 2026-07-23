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
 * properties:
 *   certification_slug:
 *     type: string
 *     description: Slug of the certification from the shared catalogue
 *   document_url:
 *     type: string
 *     nullable: true
 *     description: URL of the uploaded certificate document (PDF/image)
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
  document_url: z.string().url().nullish(),
  expires_at: z.coerce.date().nullish()
})
