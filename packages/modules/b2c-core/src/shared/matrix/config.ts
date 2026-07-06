import { MedusaError } from '@medusajs/framework/utils'

export type MatrixConfig = {
  baseUrl: string
  serverName: string
  adminToken: string
}

/**
 * Same Synapse homeserver + admin token the tese dashboard stack uses
 * (tese-backend services/v3/matrix). Read lazily so env is resolved at
 * request time, matching how the TalkJS routes read their env.
 */
export const getMatrixConfig = (): MatrixConfig => {
  const baseUrl = process.env.MATRIX_BASE_URL
  const adminToken =
    process.env.MATRIX_ADMIN_TOKEN || process.env.SYNAPSE_ADMIN_TOKEN

  if (!baseUrl || !adminToken) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      'Matrix is not configured (MATRIX_BASE_URL / MATRIX_ADMIN_TOKEN)'
    )
  }

  let serverName = process.env.MATRIX_SERVER_NAME
  if (!serverName) {
    try {
      serverName = new URL(baseUrl).hostname
    } catch {
      serverName = 'localhost'
    }
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), serverName, adminToken }
}

/**
 * Matrix localparts must be lowercase ([a-z0-9._=/-]). Medusa IDs contain
 * uppercase ULID characters; lowercasing them is a 1:1 mapping since ULIDs
 * are generated uppercase-only.
 */
const toLocalpart = (value: string) => value.toLowerCase()

/**
 * Customers linked to a tese account (tese-sso) reuse the dashboard-wide
 * `@u_<teseUserId>` identity so their marketplace and dashboard chats live
 * under one Matrix user. Unlinked customers get a marketplace-scoped id.
 *
 * `teseUserId` MUST come from getTrustedTeseUserId (the SSO provider
 * identity), never from customer.metadata — that is customer-writable and
 * would allow impersonating another tese user's Matrix identity.
 */
export const customerMatrixId = (
  customerId: string,
  teseUserId: string | null,
  serverName: string
): string => {
  if (teseUserId) {
    return `@u_${toLocalpart(teseUserId)}:${serverName}`
  }
  return `@mpc_${toLocalpart(customerId)}:${serverName}`
}

/**
 * One shared Matrix identity per seller (all team members act as the
 * seller), mirroring how TalkJS modelled the seller as a single user.
 */
export const sellerMatrixId = (sellerId: string, serverName: string): string =>
  `@mps_${toLocalpart(sellerId)}:${serverName}`

/** Single marketplace support identity (replaces TalkJS's synthetic "admin"). */
export const adminMatrixId = (serverName: string): string =>
  `@mp_admin:${serverName}`

export const ADMIN_DISPLAY_NAME = 'Tese Support'

/**
 * Deterministic room aliases make room creation idempotent from either side
 * (same trick as tese-backend's `#sfp-<applicationId>`).
 * Replaces TalkJS conversation ids:
 *   product-{productId|orderId}-{customerId}-{sellerId} -> mp-{contextId}-{customerId}-{sellerId}
 *   admin-vendor-{sellerId}                             -> mp-admin-vendor-{sellerId}
 */
export const customerSellerAlias = (
  customerId: string,
  sellerId: string,
  contextId?: string
): string =>
  toLocalpart(
    contextId
      ? `mp-${contextId}-${customerId}-${sellerId}`
      : `mp-dm-${customerId}-${sellerId}`
  )

export const adminVendorAlias = (sellerId: string): string =>
  toLocalpart(`mp-admin-vendor-${sellerId}`)
