import { validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { adminRfqQueryConfig } from './query-config'
import { AdminGetRfqParams } from './validators'

export const adminRfqMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/rfq',
    middlewares: [
      validateAndTransformQuery(AdminGetRfqParams, adminRfqQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/rfq/:id',
    middlewares: [
      validateAndTransformQuery(AdminGetRfqParams, adminRfqQueryConfig.retrieve)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/rfq/stats',
    middlewares: []
  }
]
