import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from '@medusajs/framework/utils'

import {
  customerMatrixId,
  customerSellerAlias,
  ensureMatrixUser,
  ensureRoom,
  getMatrixConfig,
  getTrustedTeseUserId,
  sellerMatrixId,
} from '../../../../shared/matrix'

type CreateRoomBody = {
  seller_id?: string
  /** Product or order id the chat is about (drives the deterministic alias). */
  context_id?: string
  /** Room name; falls back to "Chat with <seller>". */
  subject?: string
}

/**
 * @oas [post] /store/matrix/rooms
 * operationId: "StoreEnsureMatrixRoom"
 * summary: "Get-or-create the customer<->seller chat room"
 * description: >
 *   Idempotently resolves the deterministic room for this
 *   customer/seller/context triple, creating it and force-joining both
 *   parties when it doesn't exist yet. Replaces TalkJS
 *   getOrCreateConversation("product-{id}-{customer}-{seller}").
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
  req: AuthenticatedMedusaRequest<CreateRoomBody>,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  const { seller_id, context_id, subject } = req.body || {}

  if (!seller_id || typeof seller_id !== 'string') {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'seller_id is required'
    )
  }

  const [customer, teseUserId, sellerResult] = await Promise.all([
    customerModule.retrieveCustomer(req.auth_context.actor_id),
    getTrustedTeseUserId(req),
    query.graph({
      entity: 'seller',
      filters: { id: seller_id },
      fields: ['id', 'name'],
    }),
  ])

  const seller = sellerResult.data[0]
  if (!seller) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Seller ${seller_id} not found`
    )
  }

  const { serverName } = getMatrixConfig()
  const customerMxid = customerMatrixId(customer.id, teseUserId, serverName)
  const sellerMxid = sellerMatrixId(seller.id, serverName)

  const customerName =
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    customer.email

  try {
    await Promise.all([
      ensureMatrixUser(customerMxid, customerName),
      ensureMatrixUser(sellerMxid, seller.name),
    ])

    const contextId =
      typeof context_id === 'string' && context_id ? context_id : undefined

    const { roomId, alias } = await ensureRoom({
      aliasLocalpart: customerSellerAlias(customer.id, seller.id, contextId),
      name:
        typeof subject === 'string' && subject
          ? subject
          : `Chat with ${seller.name}`,
      creator: customerMxid,
      members: [sellerMxid],
      context: contextId
        ? {
            context_id: contextId,
            ...(contextId.startsWith('prod_')
              ? { product_id: contextId }
              : {}),
          }
        : undefined,
    })

    return res.json({
      room_id: roomId,
      room_alias: alias,
      customer_matrix_id: customerMxid,
      seller_matrix_id: sellerMxid,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Matrix room error'
    logger.error(`Matrix store room: ${message}`)
    return res.status(502).json({ message: 'Could not open the chat room' })
  }
}
