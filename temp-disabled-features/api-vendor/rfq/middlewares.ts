import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { vendorRfqQueryConfig } from './query-config'
import { VendorGetRfqParams, VendorCreateQuote } from './validators'

export const vendorRfqMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/rfq',
    middlewares: [
      validateAndTransformQuery(VendorGetRfqParams, vendorRfqQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/rfq/:id',
    middlewares: [
      validateAndTransformQuery(VendorGetRfqParams, vendorRfqQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/rfq/:id/create-quote',
    middlewares: [
      validateAndTransformBody(VendorCreateQuote),
      validateAndTransformQuery(VendorGetRfqParams, vendorRfqQueryConfig.retrieve)
    ]
  }
]
