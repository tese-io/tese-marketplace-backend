import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import {
  ADMIN_DISPLAY_NAME,
  adminMatrixId,
  adminVendorAlias,
  ensureMatrixUser,
  ensureRoom,
  getMatrixConfig,
  sellerMatrixId,
} from '../../../../shared/matrix'

/**
 * @oas [post] /vendor/matrix/admin-room
 * operationId: "VendorEnsureMatrixAdminRoom"
 * summary: "Get-or-create the seller<->support chat room"
 * description: >
 *   Idempotently resolves the seller's support room with the marketplace
 *   admin identity. Replaces the TalkJS "admin-vendor-{sellerId}"
 *   conversation.
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Vendor Matrix
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope,
    ['id', 'name']
  )

  const { serverName } = getMatrixConfig()
  const sellerMxid = sellerMatrixId(seller.id, serverName)
  const adminMxid = adminMatrixId(serverName)

  try {
    await Promise.all([
      ensureMatrixUser(sellerMxid, seller.name),
      ensureMatrixUser(adminMxid, ADMIN_DISPLAY_NAME),
    ])

    const { roomId, alias } = await ensureRoom({
      aliasLocalpart: adminVendorAlias(seller.id),
      name: `Support · ${seller.name}`,
      creator: sellerMxid,
      members: [adminMxid],
    })

    return res.json({
      room_id: roomId,
      room_alias: alias,
      admin_matrix_id: adminMxid,
      seller_matrix_id: sellerMxid,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Matrix room error'
    logger.error(`Matrix vendor admin-room: ${message}`)
    return res.status(502).json({ message: 'Could not open the support room' })
  }
}
