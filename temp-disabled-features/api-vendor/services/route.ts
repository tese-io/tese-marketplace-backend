import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import { SERVICE_MARKETPLACE_MODULE, ServiceMarketplaceModuleService } from '@mercurjs/service-marketplace'
import { VendorCreateServiceType, VendorGetServicesParamsType } from './validators'

export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetServicesParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const { data: services, metadata } = await query.graph({
    entity: 'service',
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      seller_id: seller.id
    },
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    services,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreateServiceType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const service = req.scope.resolve<ServiceMarketplaceModuleService>(SERVICE_MARKETPLACE_MODULE)

  const created = await service.createServices({
    ...req.validatedBody,
    seller_id: seller.id,
    status: 'draft'
  })

  res.status(201).json({ service: created })
}
