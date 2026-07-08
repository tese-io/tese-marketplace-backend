import {
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { authenticate } from '@medusajs/medusa'

import {
  VendorCategoryMappings,
  VendorCreateCustomApiInstallation,
  VendorCreateMagentoInstallation,
  VendorShopifyAuthQuery
} from './validators'

export const vendorConnectMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/connect/providers',
    middlewares: [authenticate('seller', ['session', 'bearer'])]
  },
  {
    method: ['GET'],
    matcher: '/vendor/connect/installations',
    middlewares: [authenticate('seller', ['session', 'bearer'])]
  },
  {
    method: ['GET', 'DELETE'],
    matcher: '/vendor/connect/installations/:id',
    middlewares: [authenticate('seller', ['session', 'bearer'])]
  },
  {
    method: ['GET'],
    matcher: '/vendor/connect/installations/:id/external-categories',
    middlewares: [authenticate('seller', ['session', 'bearer'])]
  },
  {
    method: ['GET'],
    matcher: '/vendor/connect/installations/:id/category-mappings',
    middlewares: [authenticate('seller', ['session', 'bearer'])]
  },
  {
    method: ['PUT'],
    matcher: '/vendor/connect/installations/:id/category-mappings',
    middlewares: [
      authenticate('seller', ['session', 'bearer']),
      validateAndTransformBody(VendorCategoryMappings)
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/connect/installations/:id/sync',
    middlewares: [authenticate('seller', ['session', 'bearer'])]
  },
  {
    method: ['GET'],
    matcher: '/vendor/connect/shopify/auth',
    middlewares: [
      authenticate('seller', ['session', 'bearer']),
      validateAndTransformQuery(VendorShopifyAuthQuery, {})
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/connect/magento',
    middlewares: [
      authenticate('seller', ['session', 'bearer']),
      validateAndTransformBody(VendorCreateMagentoInstallation)
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/connect/custom-api',
    middlewares: [
      authenticate('seller', ['session', 'bearer']),
      validateAndTransformBody(VendorCreateCustomApiInstallation)
    ]
  }
]
