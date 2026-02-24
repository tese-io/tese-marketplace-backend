import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { loginAsUser, customerIdToMatrixId } from '../../../../utils/matrix'

/**
 * @oas [post] /store/chat/token
 * operationId: "StoreChatToken"
 * summary: "Get Matrix access token for chat"
 * description: "Returns a Matrix access token for the authenticated customer to use with the Matrix client API."
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             access_token:
 *               type: string
 *             user_id:
 *               type: string
 * tags:
 *   - Store Chat
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const mxUserId = customerIdToMatrixId(customerId)
    const { accessToken, userId } = await loginAsUser(mxUserId)
    return res.status(200).json({ access_token: accessToken, user_id: userId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Matrix token failed'
    return res.status(503).json({ message })
  }
}
