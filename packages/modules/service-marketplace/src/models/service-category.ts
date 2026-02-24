import { model } from "@medusajs/framework/utils"

export const ServiceCategory = model.define("service_category", {
  id: model.id({ prefix: "scat" }).primaryKey(),
  name: model.text().searchable(),
  handle: model.text().unique(),
  description: model.text().nullable(),
  icon: model.text().nullable(),
  parent_id: model.text().nullable(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
})
