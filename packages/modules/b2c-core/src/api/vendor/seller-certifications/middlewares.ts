import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'

import { vendorSellerCertificationQueryConfig } from './query-config'
import {
  VendorAttachSellerCertification,
  VendorGetSellerCertificationsParams
} from './validators'

export const vendorSellerCertificationsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/seller-certifications',
    middlewares: [
      validateAndTransformQuery(
        VendorGetSellerCertificationsParams,
        vendorSellerCertificationQueryConfig.list
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/vendor/seller-certifications',
    middlewares: [validateAndTransformBody(VendorAttachSellerCertification)]
  },
  {
    method: ['DELETE'],
    matcher: '/vendor/seller-certifications/:id',
    middlewares: []
  }
]
