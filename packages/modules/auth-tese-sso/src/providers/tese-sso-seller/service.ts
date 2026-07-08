import { Logger } from "@medusajs/framework/types"

import TeseSsoProviderService, {
  TeseSsoProviderOptions,
} from "../tese-sso/services/tese-sso-provider"

/**
 * Seller-scope variant of the tese SSO provider. Distinct static identifier so
 * it registers as its own /auth/seller/tese-sso-seller endpoint (auth providers
 * are keyed by identifier). Forces scope="seller" so it exchanges against the
 * tenant-scoped /sso/seller/validate-sso endpoint.
 */
class TeseSsoSellerProviderService extends TeseSsoProviderService {
  static identifier = "tese-sso-seller"
  static DISPLAY_NAME = "Tese SSO (Seller)"

  constructor(
    deps: { logger: Logger },
    options: TeseSsoProviderOptions
  ) {
    super(deps, { ...options, scope: "seller" })
  }
}

export default TeseSsoSellerProviderService
