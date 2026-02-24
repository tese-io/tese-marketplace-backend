import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetServiceOrdersParamsType = z.infer<typeof VendorGetServiceOrdersParams>
export const VendorGetServiceOrdersParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    service_id: z.string().optional()
  })
)

export type VendorSubmitDeliverableType = z.infer<typeof VendorSubmitDeliverable>
export const VendorSubmitDeliverable = z.object({
  deliverable_url: z.string().optional(),
  deliverable_description: z.string().optional(),
  seller_notes: z.string().optional()
}).strict()
