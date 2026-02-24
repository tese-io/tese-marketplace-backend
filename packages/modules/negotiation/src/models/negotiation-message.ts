import { model } from "@medusajs/framework/utils"
import { NegotiationThread } from "./negotiation-thread"

export enum MessageType {
  TEXT = "text",
  PROPOSAL = "proposal",
  COUNTER_PROPOSAL = "counter_proposal",
  SYSTEM = "system",
  FILE_SHARED = "file_shared",
}

export const NegotiationMessage = model.define("negotiation_message", {
  id: model.id({ prefix: "nmsg" }).primaryKey(),
  type: model.enum(MessageType).default(MessageType.TEXT),
  sender_id: model.text(),
  sender_type: model.text(),
  content: model.text(),
  quotation_version_id: model.text().nullable(),
  proposal_data: model.json().nullable(),
  is_read: model.boolean().default(false),
  read_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
  thread: model.belongsTo(() => NegotiationThread, { mappedBy: "messages" }),
})
