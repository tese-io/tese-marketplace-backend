import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SERVICE_MARKETPLACE_MODULE, ServiceMarketplaceModuleService } from '@mercurjs/service-marketplace'
import { VendorManageTiersType } from '../../validators'

export const PUT = async (
  req: AuthenticatedMedusaRequest<VendorManageTiersType>,
  res: MedusaResponse
) => {
  const svc = req.scope.resolve<ServiceMarketplaceModuleService>(SERVICE_MARKETPLACE_MODULE)

  // Delete existing tiers and recreate
  const existingTiers = await svc.listServiceTiers({ service_id: req.params.id }, {})
  for (const tier of existingTiers) {
    await svc.deleteServiceTiers([(tier as { id: string }).id])
  }

  // Create new tiers
  const tiers = []
  for (let i = 0; i < req.validatedBody.tiers.length; i++) {
    const tier = req.validatedBody.tiers[i]
    const created = await svc.createServiceTiers({
      ...tier,
      service_id: req.params.id,
      sort_order: i
    })
    tiers.push(created)
  }

  res.json({ tiers })
}
