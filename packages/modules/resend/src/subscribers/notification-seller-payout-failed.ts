import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ResendNotificationTemplates } from "../providers/resend"
import { Hosts, PayoutWorkflowEvents, buildHostAddress, fetchStoreData } from "@mercurjs/framework"

export default async function sellerPayoutFailedHandler({
  event,
  container,
}: SubscriberArgs<{ order_id?: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeData = await fetchStoreData(container)
  if (!event.data.order_id) return
  try {
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["display_id", "seller.email", "seller.name"],
      filters: { id: event.data.order_id },
    })
    if (!order?.seller?.email) return
    await notificationService.createNotifications({
      to: order.seller.email,
      channel: "email",
      template: ResendNotificationTemplates.SELLER_PAYOUT_FAILED,
      content: { subject: `Payout failed — order #${order.display_id}` },
      data: {
        data: {
          title: "Payout failed",
          body: `Hi ${order.seller.name || "there"},\n\nWe could not process the payout for order #${order.display_id}. Please check your payout account and try again, or contact support.`,
          cta_label: "Open vendor panel",
          cta_url: buildHostAddress(Hosts.VENDOR_PANEL, "/").toString(),
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    })
  } catch (error) {
    console.error("seller payout failed email failed", error)
  }
}

export const config: SubscriberConfig = {
  event: PayoutWorkflowEvents.FAILED,
  context: { subscriberId: "seller-payout-failed-handler-resend" },
}
