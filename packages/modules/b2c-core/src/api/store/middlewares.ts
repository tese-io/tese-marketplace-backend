import { MiddlewareRoute, authenticate } from "@medusajs/framework";

import { storeCartsMiddlewares } from "./carts/middlewares";
import { storeOrderSetMiddlewares } from "./order-set/middlewares";
import { storeProductsMiddlewares } from "./products/middlewares";
import { storeReturnsMiddlewares } from "./returns/middlewares";
import { storeSellerMiddlewares } from "./seller/middlewares";
import { storeShippingOptionRoutesMiddlewares } from "./shipping-options/middlewares";
import { storeWishlistMiddlewares } from "./wishlist/middlewares";

export const storeMiddlewares: MiddlewareRoute[] = [
  {
    // tese-SSO customer provisioning: allow the not-yet-registered (claimable)
    // identity so it can create + link its customer record.
    matcher: "/store/customers/tese",
    method: ["POST"],
    middlewares: [
      authenticate("customer", ["bearer", "session"], {
        allowUnregistered: true,
      }),
    ],
  },
  {
    matcher: "/store/matrix/*",
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
  {
    matcher: "/store/reviews/*",
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
  {
    matcher: "/store/return-request/*",
    middlewares: [authenticate("customer", ["bearer", "session"])],
  },
  ...storeCartsMiddlewares,
  ...storeOrderSetMiddlewares,
  ...storeProductsMiddlewares,
  ...storeSellerMiddlewares,
  ...storeShippingOptionRoutesMiddlewares,
  ...storeReturnsMiddlewares,
  ...storeWishlistMiddlewares,
];
