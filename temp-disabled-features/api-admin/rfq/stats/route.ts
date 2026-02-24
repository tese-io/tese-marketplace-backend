import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: allRfqs } = await query.graph({
    entity: 'rfq_request',
    fields: ['id', 'status', 'type', 'created_at']
  })

  const total = allRfqs.length
  const byStatus: Record<string, number> = {}
  const byType: Record<string, number> = {}

  for (const rfq of allRfqs) {
    const r = rfq as { status: string; type: string }
    byStatus[r.status] = (byStatus[r.status] || 0) + 1
    byType[r.type] = (byType[r.type] || 0) + 1
  }

  res.json({
    stats: {
      total_rfqs: total,
      by_status: byStatus,
      by_type: byType
    }
  })
}
