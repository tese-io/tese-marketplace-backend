import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ESCROW_PAYMENT_MODULE, EscrowPaymentModuleService } from '@mercurjs/escrow-payment'
import { AdminForceReleaseType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminForceReleaseType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<EscrowPaymentModuleService>(ESCROW_PAYMENT_MODULE)

  const escrow = await service.retrieveEscrowTransaction(req.params.id, {})
  const e = escrow as { held_amount: number; released_amount: number }
  const availableAmount = Number(e.held_amount) - Number(e.released_amount || 0)

  if (availableAmount <= 0) {
    return res.status(400).json({ message: 'No funds available for release' })
  }

  const release = await service.requestRelease({
    escrow_transaction_id: req.params.id,
    amount: availableAmount,
    trigger: 'admin_override' as never
  })

  await service.approveRelease(
    (release as { id: string }).id,
    req.auth_context.actor_id
  )

  res.json({ release, message: 'Force release approved' })
}
