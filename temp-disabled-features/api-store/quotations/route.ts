import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StoreGetQuotationsParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetQuotationsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: rfqs } = await query.graph({
    entity: 'rfq_request',
    fields: ['id'],
    filters: { customer_id: req.auth_context.actor_id }
  })

  const rfqIds = rfqs.map((r: { id: string }) => r.id)

  if (!rfqIds.length) {
    return res.json({ quotations: [], count: 0, offset: 0, limit: 50 })
  }

  const { data: quotations, metadata } = await query.graph({
    entity: 'quotation_version',
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      rfq_request_id: rfqIds
    },
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    quotations,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}
