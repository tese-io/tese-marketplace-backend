import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [negotiation] } = await query.graph({
    entity: 'negotiation_thread',
    fields: req.queryConfig.fields,
    filters: { id: req.params.id, buyer_id: req.auth_context.actor_id }
  }, { throwIfKeyNotFound: true })

  if (!negotiation) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Negotiation not found')
  }

  res.json({ negotiation })
}
