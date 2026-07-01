import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import TeseSsoProviderService from "./services/tese-sso-provider"

export default ModuleProvider(Modules.AUTH, {
  services: [TeseSsoProviderService],
})
