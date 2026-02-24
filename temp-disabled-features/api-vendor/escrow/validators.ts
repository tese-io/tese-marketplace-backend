import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetEscrowParamsType = z.infer<typeof VendorGetEscrowParams>
export const VendorGetEscrowParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    type: z.string().optional()
  })
)
