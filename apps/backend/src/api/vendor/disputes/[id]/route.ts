import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [dispute] } = await query.graph({
    entity: 'dispute_case',
    fields: req.queryConfig.fields,
    filters: { id: req.params.id }
  }, { throwIfKeyNotFound: true })

  if (!dispute) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Dispute not found')
  }

  res.json({ dispute })
}
