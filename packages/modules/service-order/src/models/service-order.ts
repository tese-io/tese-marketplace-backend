import { model } from "@medusajs/framework/utils"
import { ServiceMilestone } from "./service-milestone"

export enum ServiceOrderStatus {
  PENDING_START = "pending_start",
  IN_PROGRESS = "in_progress",
  AWAITING_REVIEW = "awaiting_review",
  REVISION_REQUESTED = "revision_requested",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  DISPUTED = "disputed",
}

export const ServiceOrder = model.define("service_order", {
  id: model.id({ prefix: "sord" }).primaryKey(),
  order_id: model.text(),
  service_id: model.text(),
  service_tier_id: model.text().nullable(),
  seller_id: model.text(),
  buyer_id: model.text(),
  quotation_version_id: model.text().nullable(),
  escrow_transaction_id: model.text().nullable(),
  status: model
    .enum(ServiceOrderStatus)
    .default(ServiceOrderStatus.PENDING_START),
  total_amount: model.bigNumber(),
  currency_code: model.text().default("USD"),
  started_at: model.dateTime().nullable(),
  expected_completion_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),
  buyer_notes: model.text().nullable(),
  seller_notes: model.text().nullable(),
  revision_count: model.number().default(0),
  max_revisions: model.number().nullable(),
  metadata: model.json().nullable(),
  milestones: model.hasMany(() => ServiceMilestone),
})
