import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import { MemberRole, SellerRequest } from "@mercurjs/framework"

import { SELLER_MODULE } from "../../../../modules/seller"
import {
  attachTeseSellerMemberWorkflow,
  createSellerWorkflow,
  linkTeseSellerWorkflow,
} from "../../../../workflows/seller/workflows"
import {
  ClaimsLookupResult,
  extractEmailDomain,
  extractWebsiteHost,
  isVendorClaimsConfigured,
  lookupVendorDuplicates,
  notifySellerLinked,
} from "../../../../utils/tese-vendor-claims"
import {
  canAdoptMembershipStore,
  findSellerByTenantMetadata,
  memberIdFromAuthIdentity,
  tenantIdOf,
} from "../../../../utils/tese-seller-lookup"

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
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  // Which store is this tenant's? Three keys, most certain first:
  //   1. the caller's own membership — covers every returning user
  //      whatever their store is called,
  //   2. the legacy tenant-keyed handle,
  //   3. metadata.tese_tenant_id, the canonical key, which is what a
  //      SECOND employee of the same tenant matches on.
  // The handle alone is not enough: createSellerStep derives handles from
  // the store name, so no store created here ever carried `tese-<id>`.
  let seller: any = null

  const memberId = memberIdFromAuthIdentity(identity)
  if (memberId) {
    const [member] = await sellerService.listMembers(
      { id: memberId },
      { select: ["id", "seller_id"] }
    )
    if (member?.seller_id) {
      const [candidateSeller] = await sellerService.listSellers({ id: member.seller_id })
      if (canAdoptMembershipStore(candidateSeller, tenantId)) {
        seller = candidateSeller ?? null
      } else {
        // Same person, different tenant: they need that tenant's own store.
        logger.info(
          `tese SSO: member ${memberId} belongs to ${candidateSeller?.id} (tenant ${tenantIdOf(candidateSeller)}), not tenant ${tenantId} — resolving separately`
        )
      }
    }
  }

  if (!seller) {
    const [byHandle] = await sellerService.listSellers({ handle })
    seller = byHandle ?? null
  }

  if (!seller) {
    const all = await sellerService.listSellers(
      {},
      { select: ["id", "name", "handle", "email", "website", "metadata"], take: 1000 }
    )
    seller = findSellerByTenantMetadata(all, tenantId)
  }

  // Heal stores that predate the metadata column so the next login resolves
  // on the canonical key instead of the membership fallback.
  if (seller && tenantIdOf(seller) !== tenantId) {
    try {
      await sellerService.updateSellers({
        id: seller.id,
        metadata: { ...(seller.metadata ?? {}), tese_tenant_id: tenantId },
      })
      logger.info(`tese SSO: stamped tese_tenant_id ${tenantId} on ${seller.id}`)
    } catch (e) {
      logger.warn(
        `tese SSO: could not stamp tese_tenant_id on ${seller.id} — ${(e as Error)?.message || e}`
      )
    }
  }

  // First user of this tenant → claim-or-create (B-01).
  if (!seller) {
    // Duplicate lookup fails OPEN: a cross-service blip must not stop a
    // recruited vendor from provisioning; the reconciliation report
    // catches stragglers.
    let lookup: ClaimsLookupResult | null = null
    if (isVendorClaimsConfigured()) {
      try {
        lookup = await lookupVendorDuplicates({ teseTenantId: tenantId })
      } catch {
        lookup = null
      }
    }

    // Orphan scan: a seller for the same canonical domain that is NOT
    // already bound to a tese tenant — i.e. a direct vendor-panel signup
    // for what looks like the same legal entity. Creating now would make a
    // second store permanently, so we route through the human-confirmed
    // claim queue. Boundness is `tenantIdOf`, never the handle shape: every
    // handle is a name slug, so a prefix test treats every tese store as an
    // orphan and proposes claims against unrelated companies.
    let orphan: { id: string; name: string; handle: string } | null = null
    if (lookup?.domain_usable && lookup.domain) {
      const allSellers = await sellerService.listSellers(
        {},
        { select: ["id", "name", "handle", "email", "website", "metadata"], take: 1000 }
      )
      orphan =
        (allSellers || []).find(
          (s: any) =>
            tenantIdOf(s) === null &&
            (extractEmailDomain(s.email) === lookup!.domain ||
              extractWebsiteHost(s.website) === lookup!.domain)
        ) ?? null
    }

    if (orphan) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const {
        data: [providerRow],
      } = await query.graph({
        entity: "provider_identity",
        fields: ["id", "entity_id"],
        filters: { auth_identity_id: authIdentityId },
      })

      // No provider row (shouldn't happen post-SSO, but never key the
      // idempotency lookup on undefined — an undefined filter could
      // match someone else's request): fall through to create.
      if (!providerRow?.id) {
        orphan = null
      }
      if (orphan) {

      // Idempotent across re-logins: the pending claim request is keyed
      // on the same submitter as a vendor-panel signup would be.
      // Rejected history never counts — a declined claim can be retried.
      const { data: priorRequests } = await query.graph({
        entity: "request",
        fields: ["id", "status"],
        filters: { submitter_id: providerRow.id, type: "seller" },
      })
      const existingRequest = (priorRequests || []).find(
        (r: { status?: string }) => r.status !== "rejected"
      )
      if (existingRequest) {
        return res.status(202).json({
          claim_pending: true,
          request_id: existingRequest.id,
          seller_name: orphan.name,
        })
      }

      const eventBus = req.scope.resolve(Modules.EVENT_BUS)
      await eventBus.emit({
        name: SellerRequest.TO_CREATE,
        data: {
          data: {
            seller: { name: meta.tese_tenant_name || handle, email },
            member: { name, email },
            auth_identity_id: authIdentityId,
            provider_identity_id: providerRow?.entity_id,
            // Pre-stamped claim: the vendor is requesting access to the
            // existing store; an admin confirms in the requests queue.
            claim_target_seller_id: orphan.id,
            tese_tenant_id: tenantId,
            origin: "tese_sso",
          },
          type: "seller",
          submitter_id: providerRow.id,
        },
      })

      return res.status(202).json({
        claim_pending: true,
        seller_name: orphan.name,
      })
      }
    }

    const candidate = lookup?.candidate
    const { result } = await createSellerWorkflow(req.scope).run({
      input: {
        seller: {
          name: meta.tese_tenant_name || handle,
          // No `handle` here on purpose: createSellerStep always derives it
          // from the name, so passing one only looks like it works.
          // Persist the tese tenant_id explicitly on the seller record.
          // The marketplace-catalog sync (fetchProductsForCatalogSync)
          // reads seller.metadata.tese_tenant_id when populating the
          // MarketplaceCatalog row's tenant_id field, and it is what the
          // lookup above resolves on — a naming convention in the handle
          // would not survive a rename.
          metadata: { tese_tenant_id: tenantId },
          // Prefill from the AI-discovered candidate (invitation path) —
          // real discovered data, never fabricated (G-01).
          ...(candidate?.logo_url ? { photo: candidate.logo_url } : {}),
          ...(candidate?.website_url ? { website: candidate.website_url } : {}),
          ...(candidate?.country ? { country_code: candidate.country } : {}),
        },
        member: { name, email, role: MemberRole.OWNER },
        auth_identity_id: authIdentityId,
      } as any,
    })

    await notifySellerLinked({
      domain: lookup?.domain ?? null,
      teseTenantId: tenantId,
      sellerId: (result as any).id,
      sellerHandle: (result as any).handle ?? handle,
      via: "seller_create",
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
