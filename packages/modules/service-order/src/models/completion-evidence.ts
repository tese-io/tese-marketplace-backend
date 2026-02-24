import { model } from "@medusajs/framework/utils"

export const CompletionEvidence = model.define("completion_evidence", {
  id: model.id({ prefix: "cevd" }).primaryKey(),
  service_order_id: model.text(),
  milestone_id: model.text().nullable(),
  submitted_by: model.text(),
  type: model.text(),
  title: model.text(),
  description: model.text().nullable(),
  file_url: model.text().nullable(),
  file_name: model.text().nullable(),
  file_size: model.number().nullable(),
  metadata: model.json().nullable(),
})
