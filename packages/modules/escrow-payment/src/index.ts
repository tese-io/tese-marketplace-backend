import { Module } from "@medusajs/framework/utils"
import EscrowPaymentModuleService from "./service"

export const ESCROW_PAYMENT_MODULE = "escrowPayment"
export { EscrowPaymentModuleService }
export * from "./models"

export default Module(ESCROW_PAYMENT_MODULE, {
  service: EscrowPaymentModuleService,
})
