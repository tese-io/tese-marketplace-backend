import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SERVICE_MARKETPLACE_MODULE, ServiceMarketplaceModuleService } from '@mercurjs/service-marketplace'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const svc = req.scope.resolve<ServiceMarketplaceModuleService>(SERVICE_MARKETPLACE_MODULE)

  const result = await svc.rejectService(req.params.id)

  res.json({ service: result })
}
