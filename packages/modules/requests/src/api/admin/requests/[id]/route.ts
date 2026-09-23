import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'

import { getRequestWorkflowByType } from '../../../../workflows/requests/utils/select-workflow'
import { updateRequestWorkflow } from '../../../../workflows/requests/workflows'
import { AdminReviewRequestType } from '../validators'

/**
 * @oas [post] /admin/requests/{id}
 * operationId: "AdminReviewRequestById"
 * summary: "Get return request by id"
 * description: "Retrieves a request by id."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Request.
 *     schema:
 *       type: string
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminReviewRequest"
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             status:
 *               type: string
 *               enum: [accepted,rejected]
 * tags:
 *   - Admin Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminReviewRequestType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [request]
  } = await query.graph({
    entity: 'request',
    fields: ['id', 'type', 'data', 'submitter_id'],
    filters: {
      id: req.params.id,
      status: 'pending'
    }
  })

  if (!request) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      'This request is already reviewed'
    )
  }

  const { claim_seller_id, ...reviewBody } = req.validatedBody

  // B-06 / B-10: declining a seller application or a product submission
  // requires a written reason — the applicant/vendor sees it.
  if (
    reviewBody.status === 'rejected' &&
    (request.type === 'seller' || request.type === 'product') &&
    !reviewBody.reviewer_note?.trim()
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'A written reason is required to decline this request'
    )
  }

  if (reviewBody.status === 'rejected') {
    await updateRequestWorkflow.run({
      input: {
        id: req.params.id,
        reviewer_id: req.auth_context.actor_id,
        ...reviewBody
      },
      container: req.scope
    })

    return res.json({
      id: req.params.id,
      status: 'rejected'
    })
  }

  const workflow = getRequestWorkflowByType(request.type)

  if (!workflow) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'This type of request does not have workflow'
    )
  }

  // B-01: accept-as-claim. The reviewer chose to attach the applicant to
  // an existing seller instead of creating a new store. The target is
  // verified and stamped into request.data — the accept workflow writes
  // data back and emits it, so the accepted-subscriber branches on it.
  let requestData = request.data
  if (claim_seller_id) {
    if (request.type !== 'seller') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'claim_seller_id is only valid for seller requests'
      )
    }
    // Resolved by registration key — the requests package has no
    // compile-time dependency on the seller module.
    const sellerService = req.scope.resolve('seller') as {
      listSellers: (f: Record<string, unknown>) => Promise<{ id: string }[]>
    }
    const targets = await sellerService.listSellers({ id: claim_seller_id })
    if (!targets?.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Claim target seller ${claim_seller_id} does not exist`
      )
    }
    requestData = {
      ...(request.data as Record<string, unknown>),
      claim_target_seller_id: claim_seller_id,
      claim_decided_by: req.auth_context.actor_id
    }
  }

  const { result: createdResource } = await workflow(req.scope).run({
    input: {
      id: req.params.id,
      reviewer_id: req.auth_context.actor_id,
      data: requestData,
      ...reviewBody
    },
    throwOnError: true
  })

  return res.json({
    id: req.params.id,
    status: 'accepted',
    createdResourceType: request.type,
    createdResource
  })
}

/**
 * @oas [get] /admin/requests/{id}
 * operationId: "AdminGetRequestById"
 * summary: "Get return request by id"
 * description: "Retrieves a request by id."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Request.
 *     schema:
 *       type: string
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Comma-separated fields to include in the response.
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             request:
 *               $ref: "#/components/schemas/AdminRequest"
 * tags:
 *   - Admin Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [request]
  } = await query.graph({
    entity: 'request',
    fields: req.queryConfig.fields,
    filters: {
      id: req.params.id
    }
  })

  res.json({ request })
}
