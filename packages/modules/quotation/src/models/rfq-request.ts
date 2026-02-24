import { model } from "@medusajs/framework/utils"

export enum RfqType {
  PRODUCT = "product",
  SERVICE = "service",
  MIXED = "mixed",
}

export enum RfqStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  QUOTING = "quoting",
  QUOTED = "quoted",
  IN_NEGOTIATION = "in_negotiation",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
  CONVERTED = "converted_to_order",
  CANCELLED = "cancelled",
}

export enum RfqPriority {
  STANDARD = "standard",
  URGENT = "urgent",
  VIP = "vip",
}

export const RfqRequest = model.define("rfq_request", {
  id: model.id({ prefix: "rfq" }).primaryKey(),
  title: model.text().searchable(),
  description: model.text().searchable().nullable(),
  type: model.enum(RfqType).default(RfqType.PRODUCT),
  status: model.enum(RfqStatus).default(RfqStatus.DRAFT),
  priority: model.enum(RfqPriority).default(RfqPriority.STANDARD),
  customer_id: model.text(),
  seller_id: model.text().nullable(),
  product_id: model.text().nullable(),
  service_id: model.text().nullable(),
  quantity: model.number().nullable(),
  unit: model.text().nullable(),
  budget_min: model.bigNumber().nullable(),
  budget_max: model.bigNumber().nullable(),
  currency_code: model.text().default("USD"),
  specifications: model.json().nullable(),
  attachments: model.json().nullable(),
  deadline: model.dateTime().nullable(),
  expires_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
  quotation_versions: model.hasMany(() => QuotationVersion),
})

import { QuotationVersion } from "./quotation-version"
