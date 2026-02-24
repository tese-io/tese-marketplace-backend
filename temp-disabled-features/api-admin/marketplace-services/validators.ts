import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetServicesParamsType = z.infer<typeof AdminGetServicesParams>
export const AdminGetServicesParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    type: z.string().optional(),
    seller_id: z.string().optional()
  })
)
