import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'

import {
  AdminGetBusinessVerificationsParams,
  AdminReviewBusinessVerification
} from './validators'

export const adminBusinessVerificationsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/business-verifications',
    middlewares: [
      validateAndTransformQuery(AdminGetBusinessVerificationsParams, {
        defaults: ['id'],
        isList: true
      })
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/business-verifications/:id/review',
    middlewares: [validateAndTransformBody(AdminReviewBusinessVerification)]
  }
]
