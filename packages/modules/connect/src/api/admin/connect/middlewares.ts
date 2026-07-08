import { validateAndTransformBody } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { authenticate } from '@medusajs/medusa'

import { AdminToggleProvider } from './validators'

export const adminConnectMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/connect/providers',
    middlewares: [authenticate('user', ['session', 'bearer', 'api-key'])]
  },
  {
    method: ['POST'],
    matcher: '/admin/connect/providers/:provider',
    middlewares: [
      authenticate('user', ['session', 'bearer', 'api-key']),
      validateAndTransformBody(AdminToggleProvider)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/connect/installations',
    middlewares: [authenticate('user', ['session', 'bearer', 'api-key'])]
  },
  {
    method: ['GET'],
    matcher: '/admin/connect/templates',
    middlewares: [authenticate('user', ['session', 'bearer', 'api-key'])]
  }
]
