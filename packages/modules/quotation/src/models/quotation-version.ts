import { model } from "@medusajs/framework/utils"
import { RfqRequest } from "./rfq-request"
import { QuotationTerm } from "./quotation-term"
import { QuotationLineItem } from "./quotation-line-item"

export enum QuoteStatus {
  DRAFT = "draft",
  SENT = "sent",
  VIEWED = "viewed",
  IN_NEGOTIATION = "in_negotiation",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
  WITHDRAWN = "withdrawn",
  CONVERTED = "converted_to_order",
}

export const QuotationVersion = model.define("quotation_version", {
  id: model.id({ prefix: "quote" }).primaryKey(),
  version_number: model.number().default(1),
  status: model.enum(QuoteStatus).default(QuoteStatus.DRAFT),
  seller_id: model.text(),
  total_amount: model.bigNumber(),
  currency_code: model.text().default("USD"),
  tax_amount: model.bigNumber().nullable(),
  discount_amount: model.bigNumber().nullable(),
  valid_until: model.dateTime(),
  delivery_days: model.number().nullable(),
  notes: model.text().nullable(),
  seller_message: model.text().nullable(),
  buyer_message: model.text().nullable(),
  is_counter_proposal: model.boolean().default(false),
  proposed_by: model.text().nullable(),
  parent_version_id: model.text().nullable(),
  order_id: model.text().nullable(),
  metadata: model.json().nullable(),
  rfq_request: model.belongsTo(() => RfqRequest, {
    mappedBy: "quotation_versions",
  }),
  terms: model.hasMany(() => QuotationTerm),
  line_items: model.hasMany(() => QuotationLineItem),
})
