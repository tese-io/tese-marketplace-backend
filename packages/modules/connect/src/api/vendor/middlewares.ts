import { MiddlewareRoute } from '@medusajs/framework'

import { vendorConnectMiddlewares } from './connect/middlewares'

export const vendorMiddlewares: MiddlewareRoute[] = [...vendorConnectMiddlewares]
