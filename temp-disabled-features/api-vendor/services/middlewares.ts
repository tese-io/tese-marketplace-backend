import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { vendorServiceQueryConfig } from './query-config'
import { VendorGetServicesParams, VendorCreateService, VendorUpdateService, VendorManageTiers } from './validators'

export const vendorServicesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/services',
    middlewares: [
      validateAndTransformQuery(VendorGetServicesParams, vendorServiceQueryConfig.list)
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/services',
    middlewares: [
      validateAndTransformBody(VendorCreateService),
      validateAndTransformQuery(VendorGetServicesParams, vendorServiceQueryConfig.retrieve)
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/services/:id',
    middlewares: [
      validateAndTransformQuery(VendorGetServicesParams, vendorServiceQueryConfig.retrieve)
    ]
  },
  {
    method: ['PUT'],
    matcher: '/vendor/services/:id',
    middlewares: [
      validateAndTransformBody(VendorUpdateService),
      validateAndTransformQuery(VendorGetServicesParams, vendorServiceQueryConfig.retrieve)
    ]
  },
  {
    method: ['PUT'],
    matcher: '/vendor/services/:id/tiers',
    middlewares: [
      validateAndTransformBody(VendorManageTiers)
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/services/:id/publish',
    middlewares: []
  }
]
