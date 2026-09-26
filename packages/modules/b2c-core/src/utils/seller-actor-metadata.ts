/**
 * Pointing an auth identity at the member it should act as.
 *
 * Medusa's `setAuthAppMetadataStep` refuses to write a key that already
 * exists ("Key seller_id already exists in app metadata"), so it can only
 * ever run ONCE per identity. That is wrong for tese SSO, where the same
 * person signs in again and again and may legitimately move between stores
 * (a tenant switch mints a new member). Re-login was therefore a 500 on
 * the sign-in path the moment the store lookup started succeeding.
 *
 * These helpers are the pure half of the replacement step.
 */

export const SELLER_ACTOR_KEY = "seller_id"

export type AppMetadata = Record<string, unknown> | null | undefined

export type ActorMetadataPlan = {
  /** false when the identity already points at this member — a no-op. */
  changed: boolean
  /** What to persist (omitted when `changed` is false). */
  appMetadata?: Record<string, unknown>
  /** Previous value, for compensation; null when there was none. */
  oldValue: string | null
}

export function currentSellerActor(appMetadata: AppMetadata): string | null {
  const raw = (appMetadata || {})[SELLER_ACTOR_KEY]
  return typeof raw === "string" && raw.trim() ? raw : null
}

/**
 * What to write so the identity acts as `memberId`. Never mutates the input.
 */
export function planSellerActor(
  appMetadata: AppMetadata,
  memberId: string
): ActorMetadataPlan {
  const oldValue = currentSellerActor(appMetadata)
  if (oldValue === memberId) {
    return { changed: false, oldValue }
  }
  return {
    changed: true,
    appMetadata: { ...(appMetadata || {}), [SELLER_ACTOR_KEY]: memberId },
    oldValue,
  }
}

/**
 * What to write to undo the above. A previously-absent key is removed
 * rather than set to null, so the identity is left exactly as it was.
 */
export function revertSellerActor(
  appMetadata: AppMetadata,
  oldValue: string | null
): Record<string, unknown> {
  const next = { ...(appMetadata || {}) }
  if (oldValue === null) {
    delete next[SELLER_ACTOR_KEY]
  } else {
    next[SELLER_ACTOR_KEY] = oldValue
  }
  return next
}
