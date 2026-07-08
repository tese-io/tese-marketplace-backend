import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import {
  customerMatrixId,
  ensureMatrixUser,
  getMatrixConfig,
  getTrustedTeseUserId,
  loginAsMatrixUser,
} from '../../../../shared/matrix'

/**
 * @oas [post] /store/matrix/token
 * operationId: "StoreCreateMatrixToken"
 * summary: "Mint a Matrix access token for the authenticated customer"
 * description: >
 *   Ensures a Matrix user exists for the customer (reusing the tese-wide
 *   `@u_<teseUserId>` identity when the customer is tese-SSO linked) and
 *   returns a client access token for the shared Synapse homeserver.
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Store Matrix
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  const [customer, teseUserId] = await Promise.all([
    customerModule.retrieveCustomer(req.auth_context.actor_id),
    getTrustedTeseUserId(req),
  ])

  const { baseUrl, serverName } = getMatrixConfig()
  const matrixUserId = customerMatrixId(customer.id, teseUserId, serverName)
  const displayName =
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    customer.email

  try {
    await ensureMatrixUser(matrixUserId, displayName)
    const session = await loginAsMatrixUser(matrixUserId)

    return res.json({
      access_token: session.accessToken,
      user_id: session.userId,
      homeserver_url: baseUrl,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Matrix login failed'
    logger.error(`Matrix store token: ${message}`)
    return res.status(502).json({ message: 'Matrix login failed' })
  }
}
