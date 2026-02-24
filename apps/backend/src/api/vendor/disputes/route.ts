import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import { VendorGetDisputesParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetDisputesParamsType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: escrows } = await query.graph({
    entity: 'escrow_transaction',
    fields: ['id'],
    filters: { seller_id: seller.id }
  })

  const escrowIds = escrows.map((e: { id: string }) => e.id)

  if (!escrowIds.length) {
    return res.json({ disputes: [], count: 0, offset: 0, limit: 25 })
  }

  const { data: disputes, metadata } = await query.graph({
    entity: 'dispute_case',
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      escrow_transaction_id: escrowIds
    },
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    disputes,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}
