import { Module } from "@medusajs/framework/utils"
import QuotationModuleService from "./service"

export const QUOTATION_MODULE = "quotation"
export { QuotationModuleService }
export * from "./models"

export default Module(QUOTATION_MODULE, { service: QuotationModuleService })
