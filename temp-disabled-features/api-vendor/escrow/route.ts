import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import { VendorGetEscrowParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetEscrowParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const { data: transactions, metadata } = await query.graph({
    entity: 'escrow_transaction',
    fields: req.queryConfig.fields,
    filters: { ...req.filterableFields, seller_id: seller.id },
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    transactions,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}
