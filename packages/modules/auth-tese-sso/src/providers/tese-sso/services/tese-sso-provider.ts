import {
  AbstractAuthModuleProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from "@medusajs/framework/types"

type InjectedDependencies = {
  logger: Logger
}

export type TeseSsoProviderOptions = {
  /** Base URL of the tese backend, e.g. https://api.tese.io (no trailing slash). */
  teseBackendUrl: string
  /**
   * Which tese SSO scope this provider instance exchanges against.
   * "customer" (default) → /sso/marketplace/validate-sso (buyer storefront).
   * "seller"             → /sso/seller/validate-sso (vendor panel, tenant-scoped).
   */
  scope?: "customer" | "seller"
}

type TeseSsoUser = {
  id: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
}

type TeseSsoTenant = {
  id: string
  name?: string
  handle?: string
  role?: string | null
  organization_admin?: boolean
}

type TeseSsoData = {
  user: TeseSsoUser
  tenant?: TeseSsoTenant
}

/**
 * Tese SSO auth provider.
 *
 * The storefront obtains a one-time SSO key from the tese platform (via the
 * dashboard handoff), then calls POST /auth/customer/tese-sso with { sso_key }.
 * This provider exchanges that key server-to-server against the tese backend's
 * /api/v1/sso/marketplace/validate-sso endpoint and, on success, retrieves or
 * creates the Medusa auth identity keyed by the tese user id.
 *
 * No shared JWT secret is required: trust is established by the one-time key
 * exchange over a server-to-server call.
 */
class TeseSsoProviderService extends AbstractAuthModuleProvider {
  static identifier = "tese-sso"
  static DISPLAY_NAME = "Tese SSO"

  protected logger_: Logger
  protected options_: TeseSsoProviderOptions

  constructor({ logger }: InjectedDependencies, options: TeseSsoProviderOptions) {
    // @ts-expect-error - forwarded to AbstractAuthModuleProvider like the built-in providers
    super(...arguments)
    this.logger_ = logger
    this.options_ = options

    if (!options?.teseBackendUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "tese-sso provider requires the `teseBackendUrl` option"
      )
    }
  }

  private get scope(): "customer" | "seller" {
    return this.options_.scope === "seller" ? "seller" : "customer"
  }

  private async exchangeKey(ssoKey: string): Promise<TeseSsoData | null> {
    const path =
      this.scope === "seller"
        ? "/api/v1/sso/seller/validate-sso"
        : "/api/v1/sso/marketplace/validate-sso"
    const url = `${this.options_.teseBackendUrl.replace(/\/$/, "")}${path}`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ssoKey }),
      })
      const payload: any = await res.json().catch(() => null)
      const user: TeseSsoUser | undefined = payload?.data?.user
      if (!res.ok || !payload?.status || !user?.id) {
        return null
      }
      return { user, tenant: payload?.data?.tenant }
    } catch (e: any) {
      this.logger_?.error(`tese-sso key exchange failed: ${e?.message ?? e}`)
      return null
    }
  }

  private buildUserMetadata(data: TeseSsoData): Record<string, unknown> {
    const { user, tenant } = data
    const meta: Record<string, unknown> = {
      tese_user_id: String(user.id),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
    }
    // Seller handoff pins the active tenant + role so the /vendor/sellers/tese
    // route can provision/link the seller store and member.
    if (this.scope === "seller" && tenant) {
      meta.tese_tenant_id = tenant.id
      meta.tese_tenant_name = tenant.name
      meta.tese_tenant_handle = tenant.handle
      meta.tese_role = tenant.role ?? null
      meta.tese_org_admin = Boolean(tenant.organization_admin)
    }
    return meta
  }

  private async resolveIdentity(
    ssoKey: string,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    if (!ssoKey || typeof ssoKey !== "string") {
      return { success: false, error: "Missing sso_key" }
    }

    const data = await this.exchangeKey(ssoKey)
    if (!data) {
      return { success: false, error: "Invalid or expired SSO key" }
    }

    const entityId = String(data.user.id)
    const userMetadata = this.buildUserMetadata(data)

    try {
      const authIdentity = await authIdentityService.retrieve({
        entity_id: entityId,
      })
      // Seller scope: refresh the pinned tenant + role on every login so a
      // context switch / role change in tese takes effect immediately.
      if (this.scope === "seller") {
        const updated = await authIdentityService.update(entityId, {
          user_metadata: userMetadata,
        })
        return { success: true, authIdentity: updated }
      }
      return { success: true, authIdentity }
    } catch (error: any) {
      if (error.type !== MedusaError.Types.NOT_FOUND) {
        return { success: false, error: error.message }
      }
    }

    // First time this tese identity reaches the marketplace — provision a
    // claimable auth identity. The linked actor (customer or seller member) is
    // created later by the matching custom route, which reads user_metadata.
    const authIdentity = await authIdentityService.create({
      entity_id: entityId,
      user_metadata: userMetadata,
    })
    return { success: true, authIdentity }
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const ssoKey = (data.body as any)?.sso_key
    return this.resolveIdentity(ssoKey, authIdentityService)
  }

  async register(
    data: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const ssoKey = (data.body as any)?.sso_key
    return this.resolveIdentity(ssoKey, authIdentityService)
  }

  // Key-based flow — there is no OAuth-style redirect callback.
  async validateCallback(): Promise<AuthenticationResponse> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "tese-sso does not support callback-based authentication"
    )
  }
}

export default TeseSsoProviderService
