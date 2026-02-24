import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetEscrowParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetEscrowParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: transactions, metadata } = await query.graph({
    entity: 'escrow_transaction',
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    escrow_transactions: transactions,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}
