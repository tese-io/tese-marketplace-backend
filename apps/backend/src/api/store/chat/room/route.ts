import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { getOrCreateMarketplaceRoom } from '../../../../utils/matrix'
import type { StoreChatRoomBodyType } from '../validators'

/**
 * @oas [post] /store/chat/room
 * operationId: "StoreChatRoom"
 * summary: "Get or create a chat room"
 * description: "Returns a Matrix room_id for the given product/seller or order. Creates the room if it does not exist."
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           product_id:
 *             type: string
 *           seller_id:
 *             type: string
 *           order_id:
 *             type: string
 *           room_name:
 *             type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             room_id:
 *               type: string
 * tags:
 *   - Store Chat
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<StoreChatRoomBodyType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  const body = req.validatedBody
  if (!body?.seller_id) {
    return res.status(400).json({ message: 'seller_id is required' })
  }
  try {
    const { room_id } = await getOrCreateMarketplaceRoom({
      customerId,
      sellerId: body.seller_id,
      productId: body.product_id,
      orderId: body.order_id,
      roomName: body.room_name
    })
    return res.status(200).json({ room_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get or create room'
    return res.status(503).json({ message })
  }
}
