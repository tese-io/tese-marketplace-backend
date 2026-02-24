import { z } from 'zod'
import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetServicesParamsType = z.infer<typeof VendorGetServicesParams>
export const VendorGetServicesParams = createFindParams({ offset: 0, limit: 50 }).merge(
  z.object({
    status: z.string().optional(),
    type: z.string().optional()
  })
)

export type VendorCreateServiceType = z.infer<typeof VendorCreateService>
export const VendorCreateService = z.object({
  title: z.string().min(1),
  handle: z.string().optional(),
  description: z.string().min(1),
  short_description: z.string().optional(),
  type: z.enum([
    'esg_audit', 'carbon_consulting', 'sustainability_strategy',
    'impact_reporting', 'supply_chain_assessment', 'climate_risk_analysis',
    'green_certification', 'training_workshop', 'custom'
  ]).default('custom'),
  category_id: z.string().optional(),
  thumbnail: z.string().optional(),
  images: z.array(z.string()).optional(),
  duration_days: z.number().optional(),
  is_custom_quote_enabled: z.boolean().default(true),
  min_budget: z.number().optional(),
  max_budget: z.number().optional(),
  currency_code: z.string().default('USD'),
  tags: z.array(z.string()).optional(),
  certifications_required: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  company_size_fit: z.array(z.string()).optional()
}).strict()

export type VendorUpdateServiceType = z.infer<typeof VendorUpdateService>
export const VendorUpdateService = VendorCreateService.partial()

export type VendorManageTiersType = z.infer<typeof VendorManageTiers>
export const VendorManageTiers = z.object({
  tiers: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    level: z.enum(['basic', 'pro', 'enterprise']),
    description: z.string().optional(),
    price: z.number().positive(),
    currency_code: z.string().default('USD'),
    duration_days: z.number().optional(),
    features: z.array(z.string()).optional(),
    deliverables_included: z.array(z.string()).optional(),
    max_revisions: z.number().optional(),
    support_level: z.string().optional(),
    is_popular: z.boolean().optional(),
    sort_order: z.number().optional()
  }))
}).strict()
