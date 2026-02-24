import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { vendorServiceOrderQueryConfig } from './query-config'
import { VendorGetServiceOrdersParams, VendorSubmitDeliverable } from './validators'

export const vendorServiceOrdersMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/service-orders',
    middlewares: [
      validateAndTransformQuery(VendorGetServiceOrdersParams, vendorServiceOrderQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/service-orders/:id',
    middlewares: [
      validateAndTransformQuery(VendorGetServiceOrdersParams, vendorServiceOrderQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/service-orders/:id/submit-deliverable',
    middlewares: [
      validateAndTransformBody(VendorSubmitDeliverable)
    ]
  }
]
