import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'

import { adminSellerCertificationQueryConfig } from './query-config'
import {
  AdminGetSellerCertificationsParams,
  AdminVerifySellerCertification
} from './validators'

export const adminSellerCertificationsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/seller-certifications',
    middlewares: [
      validateAndTransformQuery(
        AdminGetSellerCertificationsParams,
        adminSellerCertificationQueryConfig.list
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/seller-certifications/:id/verify',
    middlewares: [validateAndTransformBody(AdminVerifySellerCertification)]
  }
]
