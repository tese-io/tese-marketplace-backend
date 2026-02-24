import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [rfq] } = await query.graph({
    entity: 'rfq_request',
    fields: req.queryConfig.fields,
    filters: { id: req.params.id }
  }, { throwIfKeyNotFound: true })

  if (!rfq) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'RFQ not found')
  }

  res.json({ rfq })
}
