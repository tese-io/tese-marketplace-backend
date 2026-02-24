import { model } from "@medusajs/framework/utils"

export const NegotiationAuditLog = model.define("negotiation_audit_log", {
  id: model.id({ prefix: "nalog" }).primaryKey(),
  thread_id: model.text(),
  action: model.text(),
  actor_id: model.text(),
  actor_type: model.text(),
  old_value: model.json().nullable(),
  new_value: model.json().nullable(),
  ip_address: model.text().nullable(),
  metadata: model.json().nullable(),
})
