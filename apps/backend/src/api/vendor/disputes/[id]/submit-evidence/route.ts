import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ESCROW_PAYMENT_MODULE, EscrowPaymentModuleService } from '@mercurjs/escrow-payment'
import { VendorSubmitEvidenceType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorSubmitEvidenceType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<EscrowPaymentModuleService>(ESCROW_PAYMENT_MODULE)

  const updated = await service.updateDisputeCases({
    id: req.params.id,
    seller_evidence: req.validatedBody.evidence,
    status: 'evidence_submitted'
  })

  res.json({ dispute: updated })
}
