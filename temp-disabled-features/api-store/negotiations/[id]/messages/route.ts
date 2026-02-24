import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { NEGOTIATION_MODULE, NegotiationModuleService } from '@mercurjs/negotiation'
import { StoreSendNegotiationMessageType } from '../../validators'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: messages, metadata } = await query.graph({
    entity: 'negotiation_message',
    fields: ['*'],
    filters: { thread_id: req.params.id },
    pagination: { ...req.queryConfig.pagination }
  })

  // Mark as read
  const service = req.scope.resolve<NegotiationModuleService>(NEGOTIATION_MODULE)
  await service.markMessagesAsRead(req.params.id, req.auth_context.actor_id)

  res.json({
    messages,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreSendNegotiationMessageType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<NegotiationModuleService>(NEGOTIATION_MODULE)

  const message = await service.sendMessage({
    thread_id: req.params.id,
    sender_id: req.auth_context.actor_id,
    sender_type: 'customer',
    ...req.validatedBody
  })

  res.status(201).json({ message })
}
