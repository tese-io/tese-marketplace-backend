import { MiddlewareRoute, authenticate } from '@medusajs/framework'

import { storeCartsMiddlewares } from './carts/middlewares'
import { storeChatMiddlewares } from './chat/middlewares'
import { storeOrderSetMiddlewares } from './order-set/middlewares'
import { storeOrderReturnRequestsMiddlewares } from './return-request/middlewares'
import { storeReturnsMiddlewares } from './returns/middlewares'
import { storeReviewMiddlewares } from './reviews/middlewares'
import { storeSellerMiddlewares } from './seller/middlewares'
import { storeShippingOptionRoutesMiddlewares } from './shipping-options/middlewares'
import { storeWishlistMiddlewares } from './wishlist/middlewares'
import { storeAiSearchMiddlewares } from './products/ai-search/middlewares'
// Temporarily disabled - modules not ready
// import { storeRfqMiddlewares } from './rfq/middlewares'
// import { storeServicesMiddlewares } from './services/middlewares'
// import { storeQuotationsMiddlewares } from './quotations/middlewares'
// import { storeNegotiationsMiddlewares } from './negotiations/middlewares'

export const storeMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/store/reviews/*',
    middlewares: [authenticate('customer', ['bearer', 'session'])]
  },
  {
    matcher: '/store/return-request/*',
    middlewares: [authenticate('customer', ['bearer', 'session'])]
  },
  {
    matcher: '/store/chat/*',
    middlewares: [authenticate('customer', ['bearer', 'session'])]
  },
  // Temporarily disabled - modules not ready
  // {
  //   matcher: '/store/rfq/*',
  //   middlewares: [authenticate('customer', ['bearer', 'session'])]
  // },
  // {
  //   matcher: '/store/quotations/*',
  //   middlewares: [authenticate('customer', ['bearer', 'session'])]
  // },
  // {
  //   matcher: '/store/negotiations/*',
  //   middlewares: [authenticate('customer', ['bearer', 'session'])]
  // },
  ...storeCartsMiddlewares,
  ...storeChatMiddlewares,
  ...storeOrderReturnRequestsMiddlewares,
  ...storeOrderSetMiddlewares,
  ...storeReviewMiddlewares,
  ...storeSellerMiddlewares,
  ...storeShippingOptionRoutesMiddlewares,
  ...storeWishlistMiddlewares,
  ...storeReturnsMiddlewares,
  ...storeAiSearchMiddlewares,
  // Temporarily disabled - modules not ready
  // ...storeRfqMiddlewares,
  // ...storeServicesMiddlewares,
  // ...storeQuotationsMiddlewares,
  // ...storeNegotiationsMiddlewares
]
