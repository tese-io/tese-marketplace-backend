import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [transaction] } = await query.graph({
    entity: 'escrow_transaction',
    fields: req.queryConfig.fields,
    filters: { id: req.params.id }
  }, { throwIfKeyNotFound: true })

  if (!transaction) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Escrow transaction not found')
  }

  res.json({ escrow_transaction: transaction })
}
