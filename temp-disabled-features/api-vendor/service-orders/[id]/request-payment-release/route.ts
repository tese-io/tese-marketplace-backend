import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { ESCROW_PAYMENT_MODULE, EscrowPaymentModuleService } from '@mercurjs/escrow-payment'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const escrowService = req.scope.resolve<EscrowPaymentModuleService>(ESCROW_PAYMENT_MODULE)

  const { data: [order] } = await query.graph({
    entity: 'service_order',
    fields: ['id', 'escrow_transaction_id', 'total_amount'],
    filters: { id: req.params.id }
  }, { throwIfKeyNotFound: true })

  const o = order as { escrow_transaction_id: string; total_amount: number }

  const release = await escrowService.requestRelease({
    escrow_transaction_id: o.escrow_transaction_id,
    amount: Number(o.total_amount),
    trigger: 'milestone_completed' as never
  })

  res.json({ release })
}
