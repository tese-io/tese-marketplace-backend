import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StoreGetServicesParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetServicesParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: services, metadata } = await query.graph({
    entity: 'service',
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      status: 'active'
    },
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    services,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}
