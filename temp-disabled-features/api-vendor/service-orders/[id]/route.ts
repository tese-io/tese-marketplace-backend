import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { SERVICE_ORDER_MODULE, ServiceOrderModuleService } from '@mercurjs/service-order'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [order] } = await query.graph({
    entity: 'service_order',
    fields: req.queryConfig.fields,
    filters: { id: req.params.id }
  }, { throwIfKeyNotFound: true })

  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Service order not found')
  }

  res.json({ service_order: order })
}
