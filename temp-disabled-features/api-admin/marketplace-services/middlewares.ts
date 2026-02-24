import { validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { adminServiceQueryConfig } from './query-config'
import { AdminGetServicesParams } from './validators'

export const adminServicesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/marketplace-services',
    middlewares: [
      validateAndTransformQuery(AdminGetServicesParams, adminServiceQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/marketplace-services/:id',
    middlewares: [
      validateAndTransformQuery(AdminGetServicesParams, adminServiceQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/marketplace-services/:id/approve',
    middlewares: []
  },
  {
    method: ['POST'],
    matcher: '/admin/marketplace-services/:id/reject',
    middlewares: []
  }
]
