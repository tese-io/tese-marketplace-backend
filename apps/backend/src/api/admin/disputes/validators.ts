import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetDisputesParamsType = z.infer<typeof AdminGetDisputesParams>
export const AdminGetDisputesParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    reason: z.string().optional()
  })
)

export type AdminResolveDisputeType = z.infer<typeof AdminResolveDispute>
export const AdminResolveDispute = z.object({
  resolution_type: z.enum(['buyer', 'seller', 'split']),
  resolution_amount: z.number().optional(),
  admin_notes: z.string().optional()
}).strict()
