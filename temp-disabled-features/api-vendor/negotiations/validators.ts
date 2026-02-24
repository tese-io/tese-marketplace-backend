import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetNegotiationsParamsType = z.infer<typeof VendorGetNegotiationsParams>
export const VendorGetNegotiationsParams = createFindParams({ offset: 0, limit: 25 }).merge(
  z.object({
    status: z.string().optional(),
    rfq_request_id: z.string().optional()
  })
)

export type VendorSendProposalType = z.infer<typeof VendorSendProposal>
export const VendorSendProposal = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'proposal', 'counter_proposal', 'file_shared']).default('text'),
  quotation_version_id: z.string().optional(),
  proposal_data: z.record(z.unknown()).optional()
}).strict()
