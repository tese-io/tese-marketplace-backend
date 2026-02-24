import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { NEGOTIATION_MODULE, NegotiationModuleService } from '@mercurjs/negotiation'
import { VendorSendProposalType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorSendProposalType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<NegotiationModuleService>(NEGOTIATION_MODULE)

  const message = await service.sendMessage({
    thread_id: req.params.id,
    sender_id: req.auth_context.actor_id,
    sender_type: 'vendor',
    ...req.validatedBody
  })

  res.status(201).json({ message })
}
