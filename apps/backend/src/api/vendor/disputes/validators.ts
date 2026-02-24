import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetDisputesParamsType = z.infer<typeof VendorGetDisputesParams>
export const VendorGetDisputesParams = createFindParams({ offset: 0, limit: 25 }).merge(
  z.object({
    status: z.string().optional()
  })
)

export type VendorSubmitEvidenceType = z.infer<typeof VendorSubmitEvidence>
export const VendorSubmitEvidence = z.object({
  evidence: z.record(z.unknown()),
  notes: z.string().optional()
}).strict()
