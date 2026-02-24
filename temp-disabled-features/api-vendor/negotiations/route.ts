import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import { VendorGetNegotiationsParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetNegotiationsParamsType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: negotiations, metadata } = await query.graph({
    entity: 'negotiation_thread',
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      seller_id: seller.id
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
