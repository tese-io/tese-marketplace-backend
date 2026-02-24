import { MiddlewareRoute } from '@medusajs/framework'

/**
 * Extends store products query config with seller relation so that
 * product.seller is returned and "Write to seller" / "Request quote" show on the storefront.
 */
function extendStoreProductsWithSeller (req: any, _res: any, next: () => void) {
  if (req.queryConfig?.fields && Array.isArray(req.queryConfig.fields)) {
    const extra = ['*seller', '*seller.reviews']
    for (const f of extra) {
      if (!req.queryConfig.fields.includes(f)) {
        req.queryConfig.fields.push(f)
      }
    }
  }
  next()
}

export const storeProductsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/store/products',
    middlewares: [extendStoreProductsWithSeller]
  },
  {
    method: ['GET'],
    matcher: '/store/products/:id',
    middlewares: [extendStoreProductsWithSeller]
  }
]
