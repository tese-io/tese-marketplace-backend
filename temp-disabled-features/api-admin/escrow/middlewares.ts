import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { adminEscrowQueryConfig } from './query-config'
import { AdminGetEscrowParams, AdminForceRelease } from './validators'

export const adminEscrowMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/escrow',
    middlewares: [
      validateAndTransformQuery(AdminGetEscrowParams, adminEscrowQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/escrow/:id',
    middlewares: [
      validateAndTransformQuery(AdminGetEscrowParams, adminEscrowQueryConfig.retrieve)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/escrow/stats',
    middlewares: []
  },
  {
    method: ['POST'],
    matcher: '/admin/escrow/:id/force-release',
    middlewares: [
      validateAndTransformBody(AdminForceRelease)
    ]
  }
]
