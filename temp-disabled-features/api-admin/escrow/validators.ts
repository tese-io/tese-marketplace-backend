import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetEscrowParamsType = z.infer<typeof AdminGetEscrowParams>
export const AdminGetEscrowParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    type: z.string().optional(),
    seller_id: z.string().optional()
  })
)

export type AdminForceReleaseType = z.infer<typeof AdminForceRelease>
export const AdminForceRelease = z.object({
  notes: z.string().optional()
}).strict()
