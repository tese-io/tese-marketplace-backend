import { model } from "@medusajs/framework/utils"
import { Service } from "./service"

export const ServiceDeliverable = model.define("service_deliverable", {
  id: model.id({ prefix: "sdel" }).primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  sort_order: model.number().default(0),
  is_optional: model.boolean().default(false),
  estimated_days: model.number().nullable(),
  metadata: model.json().nullable(),
  service: model.belongsTo(() => Service, { mappedBy: "deliverables" }),
})
