import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetQuotationsParamsType = z.infer<typeof VendorGetQuotationsParams>
export const VendorGetQuotationsParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    rfq_request_id: z.string().optional()
  })
)
