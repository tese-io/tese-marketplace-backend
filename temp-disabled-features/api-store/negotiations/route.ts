import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StoreGetNegotiationsParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetNegotiationsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: negotiations, metadata } = await query.graph({
    entity: 'negotiation_thread',
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      buyer_id: req.auth_context.actor_id
    },
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    negotiations,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}
