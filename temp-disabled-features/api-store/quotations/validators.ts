import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type StoreGetQuotationsParamsType = z.infer<typeof StoreGetQuotationsParams>
export const StoreGetQuotationsParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    rfq_request_id: z.string().optional()
  })
)

export type StoreNegotiateQuoteType = z.infer<typeof StoreNegotiateQuote>
export const StoreNegotiateQuote = z.object({
  total_amount: z.number(),
  currency_code: z.string().default('USD'),
  valid_until: z.coerce.date(),
  notes: z.string().optional(),
  line_items: z.array(z.object({
    title: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    total_price: z.number(),
    product_id: z.string().optional(),
    service_id: z.string().optional()
  })).optional(),
  terms: z.array(z.object({
    type: z.string(),
    title: z.string(),
    description: z.string()
  })).optional()
}).strict()

export type StoreConvertToOrderType = z.infer<typeof StoreConvertToOrder>
export const StoreConvertToOrder = z.object({
  shipping_address: z.record(z.unknown()).optional(),
  billing_address: z.record(z.unknown()).optional()
}).strict()
