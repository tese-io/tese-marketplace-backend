import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import { createQuotationWorkflow } from '../../../../workflows/rfq/workflows'
import { VendorCreateQuoteType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreateQuoteType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const { result } = await createQuotationWorkflow(req.scope).run({
    input: {
      rfq_request_id: req.params.id,
      seller_id: seller.id,
      ...req.validatedBody
    }
  })

  res.status(201).json({ quotation: result })
}
