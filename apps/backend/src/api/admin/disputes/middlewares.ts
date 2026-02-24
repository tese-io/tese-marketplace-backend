import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { adminDisputeQueryConfig } from './query-config'
import { AdminGetDisputesParams, AdminResolveDispute } from './validators'

export const adminDisputesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/disputes',
    middlewares: [
      validateAndTransformQuery(AdminGetDisputesParams, adminDisputeQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/disputes/:id',
    middlewares: [
      validateAndTransformQuery(AdminGetDisputesParams, adminDisputeQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/disputes/:id/resolve',
    middlewares: [
      validateAndTransformBody(AdminResolveDispute)
    ]
  }
]
