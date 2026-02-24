import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetRfqParamsType = z.infer<typeof AdminGetRfqParams>
export const AdminGetRfqParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    type: z.string().optional(),
    customer_id: z.string().optional(),
    seller_id: z.string().optional()
  })
)
