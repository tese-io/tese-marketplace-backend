import { model } from "@medusajs/framework/utils"
import { NegotiationThread } from "./negotiation-thread"

export enum FileType {
  PROPOSAL = "proposal",
  CONTRACT = "contract",
  REPORT = "report",
  INVOICE = "invoice",
  CERTIFICATE = "certificate",
  OTHER = "other",
}

export const FileAttachment = model.define("file_attachment", {
  id: model.id({ prefix: "fatt" }).primaryKey(),
  file_name: model.text(),
  file_url: model.text(),
  file_size: model.number().nullable(),
  mime_type: model.text().nullable(),
  file_type: model.enum(FileType).default(FileType.OTHER),
  uploaded_by: model.text(),
  description: model.text().nullable(),
  metadata: model.json().nullable(),
  thread: model.belongsTo(() => NegotiationThread, {
    mappedBy: "attachments",
  }),
})
