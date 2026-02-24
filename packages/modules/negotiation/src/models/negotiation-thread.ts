import { model } from "@medusajs/framework/utils"
import { NegotiationMessage } from "./negotiation-message"
import { FileAttachment } from "./file-attachment"

export enum ThreadStatus {
  ACTIVE = "active",
  AWAITING_BUYER = "awaiting_buyer",
  AWAITING_SELLER = "awaiting_seller",
  ON_HOLD = "on_hold",
  CLOSED_ACCEPTED = "closed_accepted",
  CLOSED_REJECTED = "closed_rejected",
  CLOSED_EXPIRED = "closed_expired",
}

export const NegotiationThread = model.define("negotiation_thread", {
  id: model.id({ prefix: "neg" }).primaryKey(),
  rfq_request_id: model.text(),
  quotation_version_id: model.text().nullable(),
  buyer_id: model.text(),
  seller_id: model.text(),
  status: model.enum(ThreadStatus).default(ThreadStatus.ACTIVE),
  talkjs_conversation_id: model.text().nullable(),
  proposal_count: model.number().default(0),
  last_activity_at: model.dateTime().nullable(),
  closed_at: model.dateTime().nullable(),
  closed_reason: model.text().nullable(),
  metadata: model.json().nullable(),
  messages: model.hasMany(() => NegotiationMessage),
  attachments: model.hasMany(() => FileAttachment),
})
