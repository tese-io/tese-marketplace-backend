import { MiddlewareRoute } from '@medusajs/framework/http'

import { uploadRouteMiddlewares } from '../../../shared/utils/upload-middleware'

export const vendorUploadMiddlewares: MiddlewareRoute[] =
  uploadRouteMiddlewares('/vendor/uploads')
