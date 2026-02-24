import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { storeServiceQueryConfig } from './query-config'
import { StoreGetServicesParams, StoreRequestServiceQuote } from './validators'

export const storeServicesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/services',
    middlewares: [
      validateAndTransformQuery(StoreGetServicesParams, storeServiceQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/store/services/:id',
    middlewares: [
      validateAndTransformQuery(StoreGetServicesParams, storeServiceQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/services/:id/request-quote',
    middlewares: [
      validateAndTransformBody(StoreRequestServiceQuote)
    ]
  }
]
