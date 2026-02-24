import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { QUOTATION_MODULE, QuotationModuleService } from '@mercurjs/quotation'
import { MedusaError } from '@medusajs/framework/utils'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<QuotationModuleService>(QUOTATION_MODULE)

  const quote = await service.retrieveQuotationVersion(req.params.id, {})
  const q = quote as { status: string }

  if (q.status !== 'accepted') {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Only accepted quotations can be converted to orders'
    )
  }

  // Note: The actual cart/order creation would integrate with Medusa's core order system
  // This marks the quote as converted and returns the quote data for order creation
  const result = await service.convertQuoteToOrder(
    req.params.id,
    'pending_order_creation'
  )

  res.json({ quotation: result, message: 'Quote marked for order conversion' })
}
