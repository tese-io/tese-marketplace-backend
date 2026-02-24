import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { SERVICE_ORDER_MODULE, ServiceOrderModuleService } from '@mercurjs/service-order'
import { VendorSubmitDeliverableType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorSubmitDeliverableType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<ServiceOrderModuleService>(SERVICE_ORDER_MODULE)

  const result = await service.submitOrderForReview(
    req.params.id,
    req.validatedBody.seller_notes
  )

  res.json({ service_order: result })
}
