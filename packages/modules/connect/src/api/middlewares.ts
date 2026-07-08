import { defineMiddlewares } from '@medusajs/medusa'

import { adminMiddlewares } from './admin/middlewares'
import { vendorMiddlewares } from './vendor/middlewares'
import { webhookMiddlewares } from './webhooks/middlewares'

export default defineMiddlewares({
  routes: [...adminMiddlewares, ...vendorMiddlewares, ...webhookMiddlewares]
})
