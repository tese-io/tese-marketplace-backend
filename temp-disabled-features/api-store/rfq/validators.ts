import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type StoreGetRfqParamsType = z.infer<typeof StoreGetRfqParams>
export const StoreGetRfqParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    type: z.string().optional()
  })
)

export type StoreCreateRfqType = z.infer<typeof StoreCreateRfq>
export const StoreCreateRfq = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['product', 'service', 'mixed']).default('product'),
  seller_id: z.string().optional(),
  product_id: z.string().optional(),
  service_id: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  currency_code: z.string().default('USD'),
  specifications: z.record(z.unknown()).optional(),
  deadline: z.coerce.date().optional(),
  expires_at: z.coerce.date().optional(),
  priority: z.enum(['standard', 'urgent', 'vip']).default('standard')
}).strict()

export type StoreUpdateRfqType = z.infer<typeof StoreUpdateRfq>
export const StoreUpdateRfq = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  specifications: z.record(z.unknown()).optional(),
  deadline: z.coerce.date().optional()
}).strict()

export type StoreAcceptQuoteType = z.infer<typeof StoreAcceptQuote>
export const StoreAcceptQuote = z.object({
  quotation_version_id: z.string()
}).strict()
