import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetSellerCertificationsParamsType = z.infer<
  typeof AdminGetSellerCertificationsParams
>

export const AdminGetSellerCertificationsParams = createFindParams({
  limit: 50,
  offset: 0
}).merge(
  z.object({
    verification_status: z
      .enum(['pending', 'verified', 'rejected', 'expired'])
      .optional(),
    seller_id: z.string().optional(),
    certification_slug: z.string().optional()
  })
)

/**
 * @schema AdminVerifySellerCertification
 * type: object
 * required:
 *   - decision
 * properties:
 *   decision:
 *     type: string
 *     enum: [approve, reject]
 *   notes:
 *     type: string
 *     nullable: true
 *   verified_by:
 *     type: string
 *     description: Identifier of the reviewing admin (email or user id)
 */
export type AdminVerifySellerCertificationType = z.infer<
  typeof AdminVerifySellerCertification
>
export const AdminVerifySellerCertification = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().nullish(),
  verified_by: z.string().min(1)
})
