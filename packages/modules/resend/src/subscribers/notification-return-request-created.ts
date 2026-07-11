import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ResendNotificationTemplates } from "../providers/resend"
import { Hosts, OrderReturnRequestEvents, buildHostAddress, fetchStoreData } from "@mercurjs/framework"

export default async function returnRequestCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeData = await fetchStoreData(container)
  const requestId = event.data.id
  try {
    const { data: [request] } = await query.graph({
      entity: "order_return_request",
      fields: [
        "id",
        "status",
        "order.id",
        "order.display_id",
        "order.email",
        "order.customer.first_name",
        "seller.id",
        "seller.email",
        "seller.name",
      ],
      filters: { id: requestId },
    })
    if (!request) return
    const orderLabel = request.order?.display_id || request.order?.id || ""
    const buyerUrl = buildHostAddress(Hosts.STOREFRONT, `/user/orders/${request.order?.id || ""}`).toString()
    const sellerUrl = buildHostAddress(Hosts.VENDOR_PANEL, `/orders/${request.order?.id || ""}`).toString()
    const notifications: any[] = []
    if (request.order?.email) {
      notifications.push({
        to: request.order.email,
        channel: "email",
        template: ResendNotificationTemplates.BUYER_RETURN_REQUEST,
        content: { subject: `Return request opened for order #${orderLabel}` },
        data: {
          data: {
            title: "We received your return request",
            body: `Hi ${request.order.customer?.first_name || "there"},\n\nYour return request for order #${orderLabel} is pending review.`,
            cta_label: "View order",
            cta_url: buyerUrl,
            store_name: storeData.store_name,
            storefront_url: storeData.storefront_url,
          },
        },
      })
    }
    if (request.seller?.email) {
      notifications.push({
        to: request.seller.email,
        channel: "email",
        template: ResendNotificationTemplates.SELLER_RETURN_REQUEST,
        content: { subject: `New return request for order #${orderLabel}` },
        data: {
          data: {
            title: "New return request",
            body: `Hi ${request.seller.name || "there"},\n\nA buyer opened a return request for order #${orderLabel}. Please review it in your vendor panel.`,
            cta_label: "Review return",
            cta_url: sellerUrl,
            store_name: storeData.store_name,
            storefront_url: storeData.storefront_url,
          },
        },
      })
    }
    if (notifications.length) await notificationService.createNotifications(notifications)
  } catch (error) {
    console.error("return request created email failed", error)
  }
}

export const config: SubscriberConfig = {
  event: OrderReturnRequestEvents.CREATED,
  context: { subscriberId: "return-request-created-handler-resend" },
}
