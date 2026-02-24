import { z } from 'zod'

export const StoreAiSearchProducts = z.object({
  query: z.string().min(1).max(500),
  page: z.number().optional().default(0),
  hitsPerPage: z.number().optional().default(12),
  region_id: z.string().optional(),
  customer_id: z.string().optional(),
  facets: z.array(z.string()).optional(),
  currency_code: z.string().optional(),
  enable_ai: z.boolean().optional().default(true)
})

export type StoreAiSearchProductsType = z.infer<typeof StoreAiSearchProducts>
