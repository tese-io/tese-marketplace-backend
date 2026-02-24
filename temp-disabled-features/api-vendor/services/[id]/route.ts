import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { SERVICE_MARKETPLACE_MODULE, ServiceMarketplaceModuleService } from '@mercurjs/service-marketplace'
import { VendorUpdateServiceType } from '../validators'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [service] } = await query.graph({
    entity: 'service',
    fields: req.queryConfig.fields,
    filters: { id: req.params.id }
  }, { throwIfKeyNotFound: true })

  if (!service) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Service not found')
  }

  res.json({ service })
}

export const PUT = async (
  req: AuthenticatedMedusaRequest<VendorUpdateServiceType>,
  res: MedusaResponse
) => {
  const svc = req.scope.resolve<ServiceMarketplaceModuleService>(SERVICE_MARKETPLACE_MODULE)

  const updated = await svc.updateServices({
    id: req.params.id,
    ...req.validatedBody
  })

  res.json({ service: updated })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const svc = req.scope.resolve<ServiceMarketplaceModuleService>(SERVICE_MARKETPLACE_MODULE)
  await svc.archiveService(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
