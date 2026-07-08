import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'

import { getTrustedTeseUserId } from '../../../shared/matrix'

/**
 * @oas [get] /store/tese-identity
 * operationId: "StoreGetTeseIdentity"
 * summary: "Return the authenticated customer's trusted tese user id"
 * description: >
 *   Resolves the tese user id from the tese-SSO auth identity (never from
 *   customer.metadata, which the customer can write). Returns null when the
 *   customer is not tese-SSO linked.
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Store Tese
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const teseUserId = await getTrustedTeseUserId(req)
  return res.json({ tese_user_id: teseUserId })
}
