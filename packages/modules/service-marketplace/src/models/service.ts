import { model } from "@medusajs/framework/utils"
import { ServiceTier } from "./service-tier"
import { ServiceDeliverable } from "./service-deliverable"

export enum ServiceStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  ARCHIVED = "archived",
}

export enum ServiceType {
  ESG_AUDIT = "esg_audit",
  CARBON_CONSULTING = "carbon_consulting",
  SUSTAINABILITY_STRATEGY = "sustainability_strategy",
  IMPACT_REPORTING = "impact_reporting",
  SUPPLY_CHAIN_ASSESSMENT = "supply_chain_assessment",
  CLIMATE_RISK_ANALYSIS = "climate_risk_analysis",
  GREEN_CERTIFICATION = "green_certification",
  TRAINING_WORKSHOP = "training_workshop",
  CUSTOM = "custom",
}

export const Service = model.define("service", {
  id: model.id({ prefix: "srv" }).primaryKey(),
  title: model.text().searchable(),
  handle: model.text().unique(),
  description: model.text().searchable(),
  short_description: model.text().nullable(),
  type: model.enum(ServiceType).default(ServiceType.CUSTOM),
  status: model.enum(ServiceStatus).default(ServiceStatus.DRAFT),
  seller_id: model.text(),
  category_id: model.text().nullable(),
  thumbnail: model.text().nullable(),
  images: model.json().nullable(),
  duration_days: model.number().nullable(),
  is_custom_quote_enabled: model.boolean().default(true),
  min_budget: model.bigNumber().nullable(),
  max_budget: model.bigNumber().nullable(),
  currency_code: model.text().default("USD"),
  tags: model.json().nullable(),
  certifications_required: model.json().nullable(),
  industries: model.json().nullable(),
  company_size_fit: model.json().nullable(),
  featured: model.boolean().default(false),
  rating: model.number().nullable(),
  review_count: model.number().default(0),
  order_count: model.number().default(0),
  metadata: model.json().nullable(),
  tiers: model.hasMany(() => ServiceTier),
  deliverables: model.hasMany(() => ServiceDeliverable),
})
