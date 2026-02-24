import { z } from 'zod'

export const StoreChatRoomBody = z.object({
  product_id: z.string().optional(),
  seller_id: z.string(),
  order_id: z.string().optional(),
  room_name: z.string().optional()
})

export type StoreChatRoomBodyType = z.infer<typeof StoreChatRoomBody>
