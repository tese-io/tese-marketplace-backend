import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  ADMIN_DISPLAY_NAME,
  adminMatrixId,
  ensureMatrixUser,
  getMatrixConfig,
  loginAsMatrixUser,
} from '../../../../shared/matrix'

/**
 * Mint a Matrix access token for the shared marketplace support identity
 * (`@mp_admin`). All admin-panel users act as this one user, mirroring the
 * synthetic "admin" TalkJS user.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  // Defense in depth on top of the admin authenticate middleware: only a
  // registered admin user may mint the shared support token.
  if (req.auth_context?.actor_type !== 'user' || !req.auth_context?.actor_id) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { baseUrl, serverName } = getMatrixConfig()
  const matrixUserId = adminMatrixId(serverName)

  try {
    await ensureMatrixUser(matrixUserId, ADMIN_DISPLAY_NAME)
    const session = await loginAsMatrixUser(matrixUserId)

    return res.json({
      access_token: session.accessToken,
      user_id: session.userId,
      homeserver_url: baseUrl,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Matrix login failed'
    logger.error(`Matrix admin token: ${message}`)
    return res.status(502).json({ message: 'Matrix login failed' })
  }
}
