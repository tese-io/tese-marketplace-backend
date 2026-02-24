import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { vendorDisputeQueryConfig } from './query-config'
import { VendorGetDisputesParams, VendorSubmitEvidence } from './validators'

export const vendorDisputesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/disputes',
    middlewares: [
      validateAndTransformQuery(VendorGetDisputesParams, vendorDisputeQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/disputes/:id',
    middlewares: [
      validateAndTransformQuery(VendorGetDisputesParams, vendorDisputeQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/disputes/:id/submit-evidence',
    middlewares: [
      validateAndTransformBody(VendorSubmitEvidence)
    ]
  }
]
