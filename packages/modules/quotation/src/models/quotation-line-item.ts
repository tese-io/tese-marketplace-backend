import { model } from "@medusajs/framework/utils"
import { QuotationVersion } from "./quotation-version"

export const QuotationLineItem = model.define("quotation_line_item", {
  id: model.id({ prefix: "qli" }).primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  product_id: model.text().nullable(),
  service_id: model.text().nullable(),
  variant_id: model.text().nullable(),
  quantity: model.number().default(1),
  unit_price: model.bigNumber(),
  total_price: model.bigNumber(),
  currency_code: model.text().default("USD"),
  tax_amount: model.bigNumber().nullable(),
  discount_amount: model.bigNumber().nullable(),
  metadata: model.json().nullable(),
  quotation_version: model.belongsTo(() => QuotationVersion, {
    mappedBy: "line_items",
  }),
})
