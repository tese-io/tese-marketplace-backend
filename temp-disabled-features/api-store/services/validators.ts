import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type StoreGetServicesParamsType = z.infer<typeof StoreGetServicesParams>
export const StoreGetServicesParams = createFindParams({ offset: 0, limit: 20 }).merge(
  z.object({
    type: z.string().optional(),
    category_id: z.string().optional(),
    seller_id: z.string().optional(),
    featured: z.boolean().optional(),
    min_price: z.number().optional(),
    max_price: z.number().optional()
  })
)

export type StoreRequestServiceQuoteType = z.infer<typeof StoreRequestServiceQuote>
export const StoreRequestServiceQuote = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  currency_code: z.string().default('USD'),
  deadline: z.coerce.date().optional(),
  specifications: z.record(z.unknown()).optional()
}).strict()
