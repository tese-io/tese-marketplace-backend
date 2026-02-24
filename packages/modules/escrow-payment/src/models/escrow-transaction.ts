import { model } from "@medusajs/framework/utils"
import { PaymentRelease } from "./payment-release"

export enum EscrowStatus {
  PENDING = "pending",
  HELD = "held",
  PARTIALLY_RELEASED = "partially_released",
  RELEASED = "released",
  REFUNDED = "refunded",
  DISPUTED = "disputed",
  CANCELLED = "cancelled",
}

export enum EscrowType {
  PRODUCT = "product",
  SERVICE = "service",
}

export const EscrowTransaction = model.define("escrow_transaction", {
  id: model.id({ prefix: "escr" }).primaryKey(),
  order_id: model.text(),
  quotation_version_id: model.text().nullable(),
  buyer_id: model.text(),
  seller_id: model.text(),
  type: model.enum(EscrowType).default(EscrowType.PRODUCT),
  status: model.enum(EscrowStatus).default(EscrowStatus.PENDING),
  total_amount: model.bigNumber(),
  held_amount: model.bigNumber(),
  released_amount: model.bigNumber().nullable(),
  refunded_amount: model.bigNumber().nullable(),
  platform_fee: model.bigNumber().nullable(),
  currency_code: model.text().default("USD"),
  stripe_payment_intent_id: model.text().nullable(),
  stripe_transfer_id: model.text().nullable(),
  stripe_charge_id: model.text().nullable(),
  held_at: model.dateTime().nullable(),
  released_at: model.dateTime().nullable(),
  auto_release_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
  releases: model.hasMany(() => PaymentRelease),
})
