import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ResendNotificationTemplates } from "../providers/resend"
import { Hosts, buildHostAddress, fetchStoreData } from "@mercurjs/framework"

export default async function buyerOrderDeliveredHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  if (event.data.no_notification) return
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeData = await fetchStoreData(container)
  try {
    const { data: [fulfillment] } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "order.id", "order.display_id", "order.email", "order.customer.first_name", "order.order_set.id"],
      filters: { id: event.data.id },
    })
    if (!fulfillment?.order?.email) return
    const order = fulfillment.order
    const orderUrl = buildHostAddress(Hosts.STOREFRONT, `/user/orders/${order.order_set?.id ?? order.id}`).toString()
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: ResendNotificationTemplates.BUYER_ORDER_DELIVERED,
      content: { subject: `Order #${order.display_id} delivered` },
      data: {
        data: {
          title: `Your order #${order.display_id} was delivered`,
          body: `Hi ${order.customer?.first_name || "there"},\n\nYour package has been marked as delivered. We hope you enjoy your purchase.`,
          cta_label: "View order",
          cta_url: orderUrl,
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    })
  } catch (error) {
    console.error("buyer delivered email failed", error)
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
  context: { subscriberId: "buyer-order-delivered-handler-resend" },
}
