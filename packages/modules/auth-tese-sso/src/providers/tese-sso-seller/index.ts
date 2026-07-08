import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import TeseSsoSellerProviderService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [TeseSsoSellerProviderService],
})
