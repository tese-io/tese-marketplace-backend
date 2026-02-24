import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { getRoomsForCustomer } from '../../../../utils/matrix'

/**
 * @oas [get] /store/chat/rooms
 * operationId: "StoreChatRooms"
 * summary: "List chat rooms for the current customer"
 * description: "Returns the list of Matrix rooms the authenticated customer is in."
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             rooms:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   room_id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   seller_id:
 *                     type: string
 * tags:
 *   - Store Chat
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  const rooms = getRoomsForCustomer(customerId)
  return res.status(200).json({ rooms })
}
