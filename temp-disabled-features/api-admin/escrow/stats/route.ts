import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: transactions } = await query.graph({
    entity: 'escrow_transaction',
    fields: ['id', 'status', 'total_amount', 'held_amount', 'released_amount', 'refunded_amount', 'currency_code']
  })

  const totalHeld = transactions
    .filter((t: { status: string }) => ['held', 'partially_released'].includes(t.status))
    .reduce((sum: number, t: { held_amount: number; released_amount: number }) =>
      sum + (Number(t.held_amount) - Number(t.released_amount || 0)), 0)

  const totalReleased = transactions
    .reduce((sum: number, t: { released_amount: number }) =>
      sum + Number(t.released_amount || 0), 0)

  const totalRefunded = transactions
    .reduce((sum: number, t: { refunded_amount: number }) =>
      sum + Number(t.refunded_amount || 0), 0)

  const byStatus: Record<string, number> = {}
  for (const t of transactions) {
    const tx = t as { status: string }
    byStatus[tx.status] = (byStatus[tx.status] || 0) + 1
  }

  res.json({
    stats: {
      total_transactions: transactions.length,
      total_held: totalHeld,
      total_released: totalReleased,
      total_refunded: totalRefunded,
      by_status: byStatus
    }
  })
}
