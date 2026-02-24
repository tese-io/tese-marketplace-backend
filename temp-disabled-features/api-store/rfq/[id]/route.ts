import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { QUOTATION_MODULE, QuotationModuleService } from '@mercurjs/quotation'
import { StoreUpdateRfqType } from '../validators'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [rfq] } = await query.graph({
    entity: 'rfq_request',
    fields: req.queryConfig.fields,
    filters: { id: req.params.id, customer_id: req.auth_context.actor_id }
  }, { throwIfKeyNotFound: true })

  if (!rfq) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'RFQ not found')
  }

  res.json({ rfq })
}

export const PATCH = async (
  req: AuthenticatedMedusaRequest<StoreUpdateRfqType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<QuotationModuleService>(QUOTATION_MODULE)

  const rfq = await service.retrieveRfqRequest(req.params.id, {})
  const r = rfq as { customer_id: string; status: string }

  if (r.customer_id !== req.auth_context.actor_id) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Not authorized')
  }

  if (!['draft', 'submitted'].includes(r.status)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, 'RFQ cannot be updated in its current state')
  }

  const updated = await service.updateRfqRequests({
    id: req.params.id,
    ...req.validatedBody
  })

  res.json({ rfq: updated })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<QuotationModuleService>(QUOTATION_MODULE)

  await service.transitionRfqStatus(req.params.id, 'cancelled' as never)

  res.status(200).json({ id: req.params.id, deleted: true })
}
