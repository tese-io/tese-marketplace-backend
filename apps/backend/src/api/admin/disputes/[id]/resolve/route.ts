import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ESCROW_PAYMENT_MODULE, EscrowPaymentModuleService } from '@mercurjs/escrow-payment'
import { AdminResolveDisputeType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminResolveDisputeType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<EscrowPaymentModuleService>(ESCROW_PAYMENT_MODULE)

  const result = await service.resolveDispute(req.params.id, {
    ...req.validatedBody,
    resolved_by: req.auth_context.actor_id
  })

  res.json({ dispute: result })
}
