import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { storeQuotationQueryConfig } from './query-config'
import { StoreGetQuotationsParams, StoreNegotiateQuote, StoreConvertToOrder } from './validators'

export const storeQuotationsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/quotations',
    middlewares: [
      validateAndTransformQuery(StoreGetQuotationsParams, storeQuotationQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/store/quotations/:id',
    middlewares: [
      validateAndTransformQuery(StoreGetQuotationsParams, storeQuotationQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/quotations/:id/negotiate',
    middlewares: [
      validateAndTransformBody(StoreNegotiateQuote)
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/quotations/:id/convert-to-order',
    middlewares: [
      validateAndTransformBody(StoreConvertToOrder)
    ]
  }
]
