import { model } from "@medusajs/framework/utils"
import { EscrowTransaction } from "./escrow-transaction"

export enum ReleaseStatus {
  PENDING = "pending",
  APPROVED = "approved",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum ReleaseTrigger {
  DELIVERY_CONFIRMED = "delivery_confirmed",
  MILESTONE_COMPLETED = "milestone_completed",
  AUTO_RELEASE = "auto_release",
  ADMIN_OVERRIDE = "admin_override",
  DISPUTE_RESOLVED = "dispute_resolved",
}

export const PaymentRelease = model.define("payment_release", {
  id: model.id({ prefix: "prel" }).primaryKey(),
  amount: model.bigNumber(),
  currency_code: model.text().default("USD"),
  status: model.enum(ReleaseStatus).default(ReleaseStatus.PENDING),
  trigger: model.enum(ReleaseTrigger),
  milestone_id: model.text().nullable(),
  approved_by: model.text().nullable(),
  approved_at: model.dateTime().nullable(),
  processed_at: model.dateTime().nullable(),
  stripe_transfer_id: model.text().nullable(),
  failure_reason: model.text().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
  escrow_transaction: model.belongsTo(() => EscrowTransaction, {
    mappedBy: "releases",
  }),
})
