import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const { data: allQuotes } = await query.graph({
    entity: 'quotation_version',
    fields: ['id', 'status', 'created_at', 'total_amount'],
    filters: { seller_id: seller.id }
  })

  const total = allQuotes.length
  const accepted = allQuotes.filter((q: { status: string }) => q.status === 'accepted').length
  const rejected = allQuotes.filter((q: { status: string }) => q.status === 'rejected').length
  const pending = allQuotes.filter((q: { status: string }) =>
    ['sent', 'viewed', 'in_negotiation'].includes(q.status)
  ).length
  const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0

  res.json({
    stats: {
      total_quotes: total,
      accepted,
      rejected,
      pending,
      conversion_rate: conversionRate
    }
  })
}
