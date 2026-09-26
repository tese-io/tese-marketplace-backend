import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

import { VERIFICATION_METHODS } from '../../../utils/business-verification'

export type AdminGetBusinessVerificationsParamsType = z.infer<
  typeof AdminGetBusinessVerificationsParams
>
export const AdminGetBusinessVerificationsParams = createFindParams({
  limit: 50,
  offset: 0
}).merge(
  z.object({
    status: z.enum(['pending', 'verified', 'rejected', 'archived']).optional(),
    seller_id: z.string().optional()
  })
)

/**
 * @schema AdminReviewBusinessVerification
 * type: object
 * required:
 *   - decision
 * properties:
 *   decision:
 *     type: string
 *     enum: [approve, reject]
 *   reviewer_note:
 *     type: string
 *     nullable: true
 *     description: Required on reject — the vendor sees it (B-27).
 *   verification_method:
 *     type: string
 *     enum: [document_only, registry_checked]
 *     description: Required on approve — how the reviewer verified (KYB-4).
 *   attach_to_seller_id:
 *     type: string
 *     nullable: true
 *     description: Approve only (B-26) — attach the applicant to this existing store and archive their shell store.
 */
export type AdminReviewBusinessVerificationType = z.infer<
  typeof AdminReviewBusinessVerification
>
export const AdminReviewBusinessVerification = z
  .object({
    decision: z.enum(['approve', 'reject']),
    reviewer_note: z.string().max(2000).nullish(),
    verification_method: z.enum(VERIFICATION_METHODS).nullish(),
    // B-26: approve by attaching the applicant to this existing store;
    // the applicant's own (shell) store is archived with a merge record.
    attach_to_seller_id: z.string().trim().min(1).nullish()
  })
  .superRefine((body, ctx) => {
    if (body.attach_to_seller_id && body.decision !== 'approve') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['attach_to_seller_id'],
        message: 'attach_to_seller_id is only valid when approving'
      })
    }
    if (body.decision === 'reject' && !body.reviewer_note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reviewer_note'],
        message: 'A written reason is required to decline — the vendor sees it'
      })
    }
    if (body.decision === 'approve' && !body.verification_method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['verification_method'],
        message: 'Record how you verified: document only, or checked against a public registry'
      })
    }
  })
