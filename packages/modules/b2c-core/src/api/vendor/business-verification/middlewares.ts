import { MiddlewareRoute, validateAndTransformBody } from '@medusajs/framework'

import {
  VendorPrefillBusinessVerification,
  VendorSubmitBusinessVerification
} from './validators'

export const vendorBusinessVerificationMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/vendor/business-verification',
    middlewares: [validateAndTransformBody(VendorSubmitBusinessVerification)]
  },
  {
    method: ['POST'],
    matcher: '/vendor/business-verification/prefill',
    middlewares: [validateAndTransformBody(VendorPrefillBusinessVerification)]
  }
]
