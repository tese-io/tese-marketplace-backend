import { validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { vendorQuotationQueryConfig } from './query-config'
import { VendorGetQuotationsParams } from './validators'

export const vendorQuotationsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/quotations',
    middlewares: [
      validateAndTransformQuery(VendorGetQuotationsParams, vendorQuotationQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/quotations/:id',
    middlewares: [
      validateAndTransformQuery(VendorGetQuotationsParams, vendorQuotationQueryConfig.retrieve)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/quotations/stats',
    middlewares: []
  }
]
