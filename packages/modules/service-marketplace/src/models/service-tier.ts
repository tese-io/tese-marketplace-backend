import { model } from "@medusajs/framework/utils"
import { Service } from "./service"

export enum TierLevel {
  BASIC = "basic",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

export const ServiceTier = model.define("service_tier", {
  id: model.id({ prefix: "stier" }).primaryKey(),
  name: model.text(),
  level: model.enum(TierLevel).default(TierLevel.BASIC),
  description: model.text().nullable(),
  price: model.bigNumber(),
  currency_code: model.text().default("USD"),
  duration_days: model.number().nullable(),
  features: model.json().nullable(),
  deliverables_included: model.json().nullable(),
  max_revisions: model.number().nullable(),
  support_level: model.text().nullable(),
  is_active: model.boolean().default(true),
  is_popular: model.boolean().default(false),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
  service: model.belongsTo(() => Service, { mappedBy: "tiers" }),
})
