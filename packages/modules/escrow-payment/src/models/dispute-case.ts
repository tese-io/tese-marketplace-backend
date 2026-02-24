import { model } from "@medusajs/framework/utils"

export enum DisputeStatus {
  CREATED = "created",
  EVIDENCE_REQUESTED = "evidence_requested",
  EVIDENCE_SUBMITTED = "evidence_submitted",
  UNDER_REVIEW = "under_review",
  RESOLVED_BUYER = "resolved_buyer",
  RESOLVED_SELLER = "resolved_seller",
  RESOLVED_SPLIT = "resolved_split",
  ESCALATED = "escalated",
  CLOSED = "closed",
}

export enum DisputeReason {
  NOT_AS_DESCRIBED = "not_as_described",
  NOT_DELIVERED = "not_delivered",
  QUALITY_ISSUE = "quality_issue",
  LATE_DELIVERY = "late_delivery",
  INCOMPLETE_SERVICE = "incomplete_service",
  COMMUNICATION_ISSUE = "communication_issue",
  OTHER = "other",
}

export const DisputeCase = model.define("dispute_case", {
  id: model.id({ prefix: "disp" }).primaryKey(),
  escrow_transaction_id: model.text(),
  order_id: model.text(),
  initiated_by: model.text(),
  initiator_type: model.text(),
  reason: model.enum(DisputeReason).default(DisputeReason.OTHER),
  status: model.enum(DisputeStatus).default(DisputeStatus.CREATED),
  description: model.text(),
  buyer_evidence: model.json().nullable(),
  seller_evidence: model.json().nullable(),
  admin_notes: model.text().nullable(),
  resolution_type: model.text().nullable(),
  resolution_amount: model.bigNumber().nullable(),
  resolved_by: model.text().nullable(),
  resolved_at: model.dateTime().nullable(),
  evidence_deadline: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})
