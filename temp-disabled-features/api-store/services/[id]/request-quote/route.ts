import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createRfqWorkflow } from '../../../../workflows/rfq/workflows'
import { StoreRequestServiceQuoteType } from '../../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreRequestServiceQuoteType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [service] } = await query.graph({
    entity: 'service',
    fields: ['id', 'seller_id', 'title'],
    filters: { id: req.params.id }
  }, { throwIfKeyNotFound: true })

  const { result } = await createRfqWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      title: req.validatedBody.title || `Quote request for ${(service as { title: string }).title}`,
      type: 'service',
      customer_id: req.auth_context.actor_id,
      service_id: req.params.id,
      seller_id: (service as { seller_id: string }).seller_id
    }
  })

  res.status(201).json({ rfq: result })
}
