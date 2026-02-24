import { Module } from "@medusajs/framework/utils"
import NegotiationModuleService from "./service"

export const NEGOTIATION_MODULE = "negotiation"
export { NegotiationModuleService }
export * from "./models"

export default Module(NEGOTIATION_MODULE, {
  service: NegotiationModuleService,
})
