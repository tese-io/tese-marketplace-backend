import { MiddlewareRoute } from '@medusajs/framework'

import { attributeMiddlewares } from './attributes/middlewares'
import { commissionMiddlewares } from './commission/middlewares'
import { configurationMiddleware } from './configuration/middlewares'
import { orderSetsMiddlewares } from './order-sets/middlewares'
import { adminProductsMiddlewares } from './products/middlewares'
import { requestsMiddlewares } from './requests/middlewares'
import { returnRequestsMiddlewares } from './return-request/middlewares'
import { reviewsMiddlewares } from './reviews/middlewares'
import { sellerMiddlewares } from './sellers/middlewares'
// Temporarily disabled - modules not ready
// import { adminRfqMiddlewares } from './rfq/middlewares'
// import { adminServicesMiddlewares } from './marketplace-services/middlewares'
// import { adminDisputesMiddlewares } from './disputes/middlewares'
// import { adminEscrowMiddlewares } from './escrow/middlewares'

export const adminMiddlewares: MiddlewareRoute[] = [
  ...orderSetsMiddlewares,
  ...requestsMiddlewares,
  ...configurationMiddleware,
  ...returnRequestsMiddlewares,
  ...commissionMiddlewares,
  ...sellerMiddlewares,
  ...reviewsMiddlewares,
  ...attributeMiddlewares,
  ...adminProductsMiddlewares,
  // Temporarily disabled - modules not ready
  // ...adminRfqMiddlewares,
  // ...adminServicesMiddlewares,
  // ...adminDisputesMiddlewares,
  // ...adminEscrowMiddlewares
]
