import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { storeNegotiationQueryConfig } from './query-config'
import { StoreGetNegotiationsParams, StoreSendNegotiationMessage } from './validators'

export const storeNegotiationsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/negotiations',
    middlewares: [
      validateAndTransformQuery(StoreGetNegotiationsParams, storeNegotiationQueryConfig.list)
    ]
  },
  {
    method: ['GET'],
    matcher: '/store/negotiations/:id',
    middlewares: [
      validateAndTransformQuery(StoreGetNegotiationsParams, storeNegotiationQueryConfig.retrieve)
    ]
  },
  {
    method: ['GET'],
    matcher: '/store/negotiations/:id/messages',
    middlewares: [
      validateAndTransformQuery(StoreGetNegotiationsParams, storeNegotiationQueryConfig.retrieve)
    ]
  },
  {
    method: ['POST'],
    matcher: '/store/negotiations/:id/messages',
    middlewares: [
      validateAndTransformBody(StoreSendNegotiationMessage)
    ]
  }
]
