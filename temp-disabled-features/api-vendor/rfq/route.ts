import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import { VendorGetRfqParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetRfqParamsType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: rfqs, metadata } = await query.graph({
    entity: 'rfq_request',
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      seller_id: seller.id
    },
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    rfqs,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}
