import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { ResendNotificationTemplates } from "../providers/resend"
import { Hosts, buildHostAddress, fetchStoreData } from "@mercurjs/framework"

/**
 * Sends seller shipped confirmation when a fulfillment shipment is created.
 */
export default async function sellerOrderShippedHandler({
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
        "order.id",
        "order.display_id",
        "order.email",
        "order.currency_code",
        "order.items.*",
        "order.shipping_address.*",
        "order.shipping_methods.*",
        "order.summary.*",
        "order.seller.email",
        "order.seller.name",
        "order.seller.id",
      ],
      filters: { id: fulfillmentId },
    })

    if (!fulfillment?.order) {
      console.error("Seller shipped email: order not found for fulfillment", fulfillmentId)
      return
    }

    const order = fulfillment.order
    const sellerEmail = order.seller?.email
    if (!sellerEmail) {
      console.error("Seller shipped email: seller email missing for order", order.id)
      return
    }

    const trackingNumber =
      (Array.isArray(fulfillment.tracking_numbers) && fulfillment.tracking_numbers[0]) ||
      order.display_id ||
      order.id

    await notificationService.createNotifications({
      to: sellerEmail,
      channel: "email",
      template: ResendNotificationTemplates.SELLER_ORDER_SHIPPED,
      content: {
        subject: `Order #${order.display_id} marked as shipped`,
      },
      data: {
        data: {
          user_name: order.seller?.name || "Seller",
          host: buildHostAddress(Hosts.VENDOR_PANEL, "/orders").toString(),
          order_id: order.id,
          order: {
            ...order,
            trackingNumber,
            total: order.summary?.current_order_total || 0,
            item_total: order.summary?.current_order_total || 0,
          },
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    })
  } catch (error) {
    console.error(`Error sending seller shipped email for fulfillment ${fulfillmentId}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
  context: {
    subscriberId: "seller-order-shipped-handler-resend",
  },
}
