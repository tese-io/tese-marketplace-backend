import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { vendorNegotiationQueryConfig } from './query-config'
import { VendorGetNegotiationsParams, VendorSendProposal } from './validators'

export const vendorNegotiationsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/negotiations',
    middlewares: [
      validateAndTransformQuery(VendorGetNegotiationsParams, vendorNegotiationQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/negotiations/:id',
    middlewares: [
      validateAndTransformQuery(VendorGetNegotiationsParams, vendorNegotiationQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/negotiations/:id/propose',
    middlewares: [
      validateAndTransformBody(VendorSendProposal)
    ]
  }
]
