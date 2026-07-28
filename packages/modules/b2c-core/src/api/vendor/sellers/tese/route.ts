import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { MemberRole } from "@mercurjs/framework"

import { SELLER_MODULE } from "../../../../modules/seller"
import {
  attachTeseSellerMemberWorkflow,
  createSellerWorkflow,
  linkTeseSellerWorkflow,
} from "../../../../workflows/seller/workflows"

/**
 * @oas [post] /vendor/sellers/tese
 * operationId: "VendorCreateTeseSeller"
 * summary: "Provision/link a seller for a tese-SSO identity"
 * description: >
 *   Completes seller onboarding for a user that authenticated through the
 *   `tese-sso-seller` provider. Reads the tenant pinned on the auth identity's
 *   user_metadata and: (a) creates the Seller store for that tenant if missing
 *   (this user becomes OWNER), or (b) attaches the user as a Member of the
 *   existing store and points the auth identity at that member. Idempotent.
 * x-authenticated: true
 * responses:
 *   "201":
 *     description: Created
 * tags:
 *   - Vendor Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing authentication context"
    )
  }

  const authModule = req.scope.resolve(Modules.AUTH)
  const identity = await authModule.retrieveAuthIdentity(authIdentityId, {
    relations: ["provider_identities"],
  })
  const providerIdentity = identity?.provider_identities?.find(
    (pi) => pi.provider === "tese-sso-seller"
  )
  const meta: Record<string, any> = providerIdentity?.user_metadata ?? {}

  const tenantId = meta.tese_tenant_id
  if (!tenantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "tese seller identity is missing a tenant"
    )
  }

  const email = meta.email
  const name =
    [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
    email ||
    "Member"
  // Immutable link key: one Mercur store per tese tenant.
  const handle = `tese-${tenantId}`

  const sellerService: any = req.scope.resolve(SELLER_MODULE)
  const sellers = await sellerService.listSellers({ handle })
  const seller = sellers?.[0]

  // First user of this tenant → create the store, this user becomes owner.
  if (!seller) {
    const { result } = await createSellerWorkflow(req.scope).run({
      input: {
        seller: {
          name: meta.tese_tenant_name || handle,
          handle,
          // Persist the tese tenant_id explicitly on the seller record.
          // The marketplace-catalog sync (fetchProductsForCatalogSync)
          // reads seller.metadata.tese_tenant_id when populating the
          // MarketplaceCatalog row's tenant_id field. The handle already
          // carries the same id ("tese-<tenantId>"), but keying off
          // metadata avoids depending on a naming convention downstream
          // and stays robust if handles ever get renamed.
          metadata: { tese_tenant_id: tenantId }
        },
        member: { name, email, role: MemberRole.OWNER },
        auth_identity_id: authIdentityId,
      } as any,
    })
    return res.status(201).json({ seller: result })
  }

  // Existing store → ensure this user has a member, then point the auth link at it.
  const role = meta.tese_org_admin ? MemberRole.ADMIN : MemberRole.MEMBER
  const existing = email
    ? await sellerService.listMembers({ seller_id: seller.id, email })
    : []

  if (existing?.length) {
    await linkTeseSellerWorkflow(req.scope).run({
      input: { auth_identity_id: authIdentityId, member_id: existing[0].id },
    })
    return res.status(200).json({ seller })
  }

  await attachTeseSellerMemberWorkflow(req.scope).run({
    input: {
      member: { seller_id: seller.id, name, email, role } as any,
      auth_identity_id: authIdentityId,
    },
  })
  return res.status(201).json({ seller })
}
