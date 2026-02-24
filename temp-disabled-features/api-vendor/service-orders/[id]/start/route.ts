import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SERVICE_ORDER_MODULE, ServiceOrderModuleService } from '@mercurjs/service-order'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<ServiceOrderModuleService>(SERVICE_ORDER_MODULE)

  const result = await service.startServiceOrder(req.params.id)

  res.json({ service_order: result })
}
