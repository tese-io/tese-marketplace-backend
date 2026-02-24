import { MiddlewareRoute } from '@medusajs/framework'
import { validateAndTransformBody } from '@medusajs/framework/http'
import { StoreAiSearchProducts } from './validators'

export const storeAiSearchMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/store/products/ai-search',
    middlewares: [
      validateAndTransformBody(StoreAiSearchProducts)
    ]
  }
]
