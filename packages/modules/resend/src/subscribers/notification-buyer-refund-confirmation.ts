import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ResendNotificationTemplates } from "../providers/resend"
import { Hosts, OrderRefundEvents, buildHostAddress, fetchStoreData } from "@mercurjs/framework"

export default async function buyerRefundConfirmationHandler({
  event,
  container,
}: SubscriberArgs<{ order_id: string; amount?: number; currency_code?: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeData = await fetchStoreData(container)
  try {
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "currency_code", "customer.first_name", "order_set.id"],
      filters: { id: event.data.order_id },
    })
    if (!order?.email) return
    const amount = event.data.amount != null ? Number(event.data.amount) / 100 : null
    const currency = (event.data.currency_code || order.currency_code || "").toUpperCase()
    const amountText = amount != null ? `${currency} ${amount.toFixed(2)}` : "your payment"
    const orderUrl = buildHostAddress(Hosts.STOREFRONT, `/user/orders/${order.order_set?.id ?? order.id}`).toString()
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: ResendNotificationTemplates.BUYER_REFUND_CONFIRMATION,
      content: { subject: `Refund processed for order #${order.display_id}` },
      data: {
        data: {
          title: "Your refund is on the way",
          body: `Hi ${order.customer?.first_name || "there"},\n\nWe processed a refund of ${amountText} for order #${order.display_id}. It may take a few business days to appear on your statement.`,
          cta_label: "View order",
          cta_url: orderUrl,
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    })
  } catch (error) {
    console.error("buyer refund confirmation email failed", error)
  }
}

export const config: SubscriberConfig = {
  event: OrderRefundEvents.PROCESSED,
  context: { subscriberId: "buyer-refund-confirmation-handler-resend" },
}
