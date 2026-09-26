/**
 * Resolving "which store belongs to this tese tenant?" — pure helpers for
 * the SSO handoff (`POST /vendor/sellers/tese`).
 *
 * History worth keeping: the route used to key solely on the handle
 * `tese-<tenantId>`, but `createSellerStep` derives every handle from the
 * store name (`toHandle(input.name)`) and ignores the one it is handed —
 * so no store ever carried that handle and the lookup never matched. Every
 * repeat SSO login therefore re-entered claim-or-create, which produced
 * bogus claim requests against unrelated stores and would eventually
 * collide on the unique handle index.
 *
 * The canonical key is `seller.metadata.tese_tenant_id` (the column only
 * exists since 2026-09-26; before that the write was silently dropped, so
 * older stores carry no marker and are healed on next login).
 */

export const TESE_HANDLE_PREFIX = 'tese-'

export type TenantSellerLike = {
  id: string
  handle?: string | null
  metadata?: Record<string, unknown> | null
}

/** The tese tenant a store is already bound to, if any. */
export function tenantIdOf(seller: TenantSellerLike | null | undefined): string | null {
  const raw = (seller?.metadata as Record<string, unknown> | undefined)?.tese_tenant_id
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  const handle = seller?.handle
  if (typeof handle === 'string' && handle.startsWith(TESE_HANDLE_PREFIX)) {
    const rest = handle.slice(TESE_HANDLE_PREFIX.length)
    if (rest) return rest
  }
  return null
}

/**
 * The member id an auth identity points at. `setAuthAppMetadataStep` with
 * `actorType: 'seller'` stores it under `app_metadata.seller_id` — the name
 * is Medusa's actor-type convention; the value is a MEMBER id, not a seller id.
 */
export function memberIdFromAuthIdentity(identity: unknown): string | null {
  const meta = (identity as { app_metadata?: Record<string, unknown> } | null)?.app_metadata
  const raw = meta?.seller_id
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

/** The store bound to this tenant, by the canonical metadata key. */
export function findSellerByTenantMetadata<T extends TenantSellerLike>(
  sellers: T[] | null | undefined,
  tenantId: string
): T | null {
  if (!tenantId) return null
  return (sellers || []).find((s) => tenantIdOf(s) === tenantId) ?? null
}

/**
 * May the store this user is already a member of be treated as this
 * tenant's store? Yes when it carries no tenant marker at all (a store
 * created before the marker existed — healed by stamping it), and yes when
 * the marker already matches. No when it belongs to a different tenant:
 * that is a tenant switch, and the user needs their own store there.
 */
export function canAdoptMembershipStore(
  seller: TenantSellerLike | null | undefined,
  tenantId: string
): boolean {
  if (!seller) return false
  const bound = tenantIdOf(seller)
  return bound === null || bound === tenantId
}
