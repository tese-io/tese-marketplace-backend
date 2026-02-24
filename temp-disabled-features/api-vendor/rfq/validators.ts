import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetRfqParamsType = z.infer<typeof VendorGetRfqParams>
export const VendorGetRfqParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    type: z.string().optional(),
    priority: z.string().optional()
  })
)

export type VendorCreateQuoteType = z.infer<typeof VendorCreateQuote>
export const VendorCreateQuote = z.object({
  total_amount: z.number().positive(),
  currency_code: z.string().default('USD'),
  valid_until: z.coerce.date(),
  delivery_days: z.number().optional(),
  notes: z.string().optional(),
  seller_message: z.string().optional(),
  line_items: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    quantity: z.number(),
    unit_price: z.number(),
    total_price: z.number(),
    product_id: z.string().optional(),
    service_id: z.string().optional(),
    variant_id: z.string().optional()
  })).optional(),
  terms: z.array(z.object({
    type: z.enum(['payment', 'delivery', 'warranty', 'cancellation', 'custom']).default('custom'),
    title: z.string(),
    description: z.string(),
    is_required: z.boolean().optional()
  })).optional()
}).strict()
