import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import {
  ensureMatrixUser,
  getMatrixConfig,
  loginAsMatrixUser,
  sellerMatrixId,
} from '../../../../shared/matrix'

/**
 * @oas [post] /vendor/matrix/token
 * operationId: "VendorCreateMatrixToken"
 * summary: "Mint a Matrix access token for the seller"
 * description: >
 *   All members of a seller share one Matrix identity (`@mps_<sellerId>`),
 *   mirroring the single TalkJS seller user. Returns a client access token
 *   for the shared Synapse homeserver.
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

  const { baseUrl, serverName } = getMatrixConfig()
  const matrixUserId = sellerMatrixId(seller.id, serverName)

  try {
    await ensureMatrixUser(matrixUserId, seller.name)
    const session = await loginAsMatrixUser(matrixUserId)

    return res.json({
      access_token: session.accessToken,
      user_id: session.userId,
      homeserver_url: baseUrl,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Matrix login failed'
    logger.error(`Matrix vendor token: ${message}`)
    return res.status(502).json({ message: 'Matrix login failed' })
  }
}
