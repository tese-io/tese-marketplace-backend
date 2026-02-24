import { model } from "@medusajs/framework/utils"
import { QuotationVersion } from "./quotation-version"

export enum TermType {
  PAYMENT = "payment",
  DELIVERY = "delivery",
  WARRANTY = "warranty",
  CANCELLATION = "cancellation",
  CUSTOM = "custom",
}

export const QuotationTerm = model.define("quotation_term", {
  id: model.id({ prefix: "qterm" }).primaryKey(),
  type: model.enum(TermType).default(TermType.CUSTOM),
  title: model.text(),
  description: model.text(),
  is_required: model.boolean().default(false),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
  quotation_version: model.belongsTo(() => QuotationVersion, {
    mappedBy: "terms",
  }),
})
