import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StoreCreateRfqType, StoreGetRfqParamsType } from './validators'
import { createRfqWorkflow } from '../../../workflows/rfq/workflows'

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetRfqParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: rfqs, metadata } = await query.graph({
    entity: 'rfq_request',
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      customer_id: req.auth_context.actor_id
    },
    pagination: { ...req.queryConfig.pagination }
  })

  res.json({
    rfqs,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateRfqType>,
  res: MedusaResponse
) => {
  const { result } = await createRfqWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id
    }
  })

  res.status(201).json({ rfq: result })
}
