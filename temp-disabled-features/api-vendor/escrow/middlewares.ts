import { validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { vendorEscrowQueryConfig } from './query-config'
import { VendorGetEscrowParams } from './validators'

export const vendorEscrowMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/escrow',
    middlewares: [
      validateAndTransformQuery(VendorGetEscrowParams, vendorEscrowQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/escrow/:id',
    middlewares: [
      validateAndTransformQuery(VendorGetEscrowParams, vendorEscrowQueryConfig.retrieve)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/escrow/stats',
    middlewares: []
  }
]
