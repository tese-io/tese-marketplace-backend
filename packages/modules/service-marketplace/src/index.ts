import { Module } from "@medusajs/framework/utils"
import ServiceMarketplaceModuleService from "./service"

export const SERVICE_MARKETPLACE_MODULE = "serviceMarketplace"
export { ServiceMarketplaceModuleService }
export * from "./models"

export default Module(SERVICE_MARKETPLACE_MODULE, {
  service: ServiceMarketplaceModuleService,
})
