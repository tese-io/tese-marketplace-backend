import { MiddlewareRoute } from '@medusajs/framework'

import { adminConnectMiddlewares } from './connect/middlewares'

export const adminMiddlewares: MiddlewareRoute[] = [...adminConnectMiddlewares]
