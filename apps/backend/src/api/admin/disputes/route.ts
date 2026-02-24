import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetDisputesParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetDisputesParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: disputes, metadata } = await query.graph({
    entity: 'dispute_case',
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    disputes,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}
