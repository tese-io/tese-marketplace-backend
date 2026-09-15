import { MiddlewareRoute, authenticate } from "@medusajs/framework";

import { attributeMiddlewares } from "./attributes/middlewares";
import { configurationMiddleware } from "./configuration/middlewares";
import { adminCustomMiddlewares } from "./custom/middlewares";
import { adminOrdersMiddlewares } from "./orders/middlewares";
import { orderSetsMiddlewares } from "./order-sets/middlewares";
import { adminProductsMiddlewares } from "./products/middlewares";
import { adminSellerCertificationsMiddlewares } from "./seller-certifications/middlewares";
import { sellerMiddlewares } from "./sellers/middlewares";
import { adminReservationsMiddlewares } from "./reservations/middlewares";
import { collectionsMiddlewares } from "./collections/middlewares";
import { productCategoriesMiddlewares } from "./product-categories/middlewares";
import { validateReceivedUploads } from "../../shared/utils/upload-middleware";

export const adminMiddlewares: MiddlewareRoute[] = [
  {
    // Explicit gate (defense in depth on top of Medusa's default /admin
    // protection): only authenticated admin users may mint Matrix tokens.
    matcher: "/admin/matrix/*",
    middlewares: [authenticate("user", ["bearer", "session", "api-key"])],
  },
  ...orderSetsMiddlewares,
  ...configurationMiddleware,
  ...sellerMiddlewares,
  ...adminSellerCertificationsMiddlewares,
  ...attributeMiddlewares,
  ...adminProductsMiddlewares,
  ...adminCustomMiddlewares,
  ...adminOrdersMiddlewares,
  ...adminReservationsMiddlewares,
  ...collectionsMiddlewares,
  ...productCategoriesMiddlewares,
  {
    // Core Medusa already parses this path. We only validate the files it
    // left on the request — a second multer would wipe `req.files`.
    method: ["POST"],
    matcher: "/admin/uploads",
    middlewares: [validateReceivedUploads],
  },
];
