import { Module } from "@medusajs/framework/utils"
import ServiceOrderModuleService from "./service"

export const SERVICE_ORDER_MODULE = "serviceOrder"
export { ServiceOrderModuleService }
export * from "./models"

export default Module(SERVICE_ORDER_MODULE, {
  service: ServiceOrderModuleService,
})
