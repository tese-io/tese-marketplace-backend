import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { storeRfqQueryConfig } from './query-config'
import { StoreGetRfqParams, StoreCreateRfq, StoreUpdateRfq, StoreAcceptQuote } from './validators'

export const storeRfqMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/rfq',
    middlewares: [
      validateAndTransformQuery(StoreGetRfqParams, storeRfqQueryConfig.list)
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/rfq',
    middlewares: [
      validateAndTransformBody(StoreCreateRfq),
      validateAndTransformQuery(StoreGetRfqParams, storeRfqQueryConfig.retrieve)
    ]
  },
  {
    method: ['GET'],
    matcher: '/store/rfq/:id',
    middlewares: [
      validateAndTransformQuery(StoreGetRfqParams, storeRfqQueryConfig.retrieve)
    ]
  },
  {
    method: ['PATCH'],
    matcher: '/store/rfq/:id',
    middlewares: [
      validateAndTransformBody(StoreUpdateRfq),
      validateAndTransformQuery(StoreGetRfqParams, storeRfqQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/rfq/:id/accept-quote',
    middlewares: [
      validateAndTransformBody(StoreAcceptQuote)
    ]
  }
]
