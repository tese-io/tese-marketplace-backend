import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const { data: transactions } = await query.graph({
    entity: 'escrow_transaction',
    fields: ['id', 'status', 'held_amount', 'released_amount', 'currency_code'],
    filters: { seller_id: seller.id }
  })

  const held = transactions
    .filter((t: { status: string }) => ['held', 'partially_released'].includes(t.status))
    .reduce((sum: number, t: { held_amount: number; released_amount: number }) =>
      sum + Number(t.held_amount) - Number(t.released_amount || 0), 0)

  const released = transactions
    .reduce((sum: number, t: { released_amount: number }) =>
      sum + Number(t.released_amount || 0), 0)

  const disputed = transactions.filter((t: { status: string }) => t.status === 'disputed').length

  res.json({
    stats: {
      total_held: held,
      total_released: released,
      disputed_count: disputed,
      total_transactions: transactions.length
    }
  })
}
