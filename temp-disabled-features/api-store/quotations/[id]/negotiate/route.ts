import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { QUOTATION_MODULE, QuotationModuleService } from '@mercurjs/quotation'
import { StoreNegotiateQuoteType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreNegotiateQuoteType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<QuotationModuleService>(QUOTATION_MODULE)

  const quote = await service.retrieveQuotationVersion(req.params.id, {})
  const q = quote as { rfq_request_id: string }

  const result = await service.createCounterProposal({
    rfq_request_id: q.rfq_request_id,
    parent_version_id: req.params.id,
    proposed_by: req.auth_context.actor_id,
    ...req.validatedBody
  })

  res.status(201).json({ quotation: result })
}
