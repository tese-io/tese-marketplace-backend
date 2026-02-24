import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [service] } = await query.graph({
    entity: 'service',
    fields: req.queryConfig.fields,
    filters: { id: req.params.id, status: 'active' }
  }, { throwIfKeyNotFound: true })

  if (!service) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Service not found')
  }

  res.json({ service })
}
