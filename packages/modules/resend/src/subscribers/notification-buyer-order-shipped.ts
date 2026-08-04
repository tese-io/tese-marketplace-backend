import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { ResendNotificationTemplates } from "../providers/resend"
import { Hosts, buildHostAddress, fetchStoreData } from "@mercurjs/framework"

/**
 * Sends buyer shipped email when a fulfillment shipment is created.
 * Event payload: { id: fulfillmentId, no_notification?: boolean }
 */
export default async function buyerOrderShippedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  if (event.data.no_notification) {
    return
  }

  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeData = await fetchStoreData(container)
  const fulfillmentId = event.data.id

  try {
    const {
      data: [fulfillment],
    } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "tracking_numbers",
        "labels.*",
        "order.id",
        "order.display_id",
        "order.email",
        "order.currency_code",
        "order.customer.*",
        "order.items.*",
        "order.shipping_address.*",
        "order.shipping_methods.*",
        "order.summary.*",
        "order.order_set.id",
      ],
      filters: { id: fulfillmentId },
    })

    if (!fulfillment?.order) {
      console.error("Buyer shipped email: order not found for fulfillment", fulfillmentId)
      return
    }

    const order = fulfillment.order
    const trackingNumber =
      (Array.isArray(fulfillment.tracking_numbers) && fulfillment.tracking_numbers[0]) ||
      order.display_id ||
      order.id

    const orderUrl = buildHostAddress(
      Hosts.STOREFRONT,
      `/user/orders/${order.order_set?.id ?? order.id}`
    ).toString()

    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: ResendNotificationTemplates.BUYER_ORDER_SHIPPED,
      content: {
        subject: `Your order #${order.display_id} has shipped`,
      },
      data: {
        data: {
          user_name: order.customer?.first_name || "Customer",
          host: buildHostAddress(Hosts.STOREFRONT, "/user").toString(),
          order_id: order.id,
          order: {
            ...order,
            trackingNumber,
            total: order.summary?.current_order_total || 0,
            item_total: order.summary?.current_order_total || 0,
          },
          order_address: orderUrl,
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    })
  } catch (error) {
    console.error(`Error sending buyer shipped email for fulfillment ${fulfillmentId}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
  context: {
    subscriberId: "buyer-order-shipped-handler-resend",
  },
}
