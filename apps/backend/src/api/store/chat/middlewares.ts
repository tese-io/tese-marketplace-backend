import { validateAndTransformBody } from '@medusajs/framework'
import { MiddlewareRoute } from '@medusajs/medusa'
import { StoreChatRoomBody } from './validators'

export const storeChatMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/store/chat/token',
    middlewares: []
  },
  {
    method: ['POST'],
    matcher: '/store/chat/room',
    middlewares: [validateAndTransformBody(StoreChatRoomBody)]
  },
  {
    method: ['GET'],
    matcher: '/store/chat/rooms',
    middlewares: []
  }
]
