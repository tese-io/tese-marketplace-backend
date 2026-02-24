import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { acceptQuotationWorkflow } from '../../../../workflows/rfq/workflows'
import { StoreAcceptQuoteType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreAcceptQuoteType>,
  res: MedusaResponse
) => {
  const { result } = await acceptQuotationWorkflow(req.scope).run({
    input: {
      quotation_version_id: req.validatedBody.quotation_version_id
    }
  })

  res.json({ quotation: result })
}
