import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ResendNotificationTemplates } from "../providers/resend"
import { Hosts, PayoutWorkflowEvents, buildHostAddress, fetchStoreData } from "@mercurjs/framework"

export default async function sellerPayoutSucceededHandler({
  event,
  container,
}: SubscriberArgs<{ id?: string; order_id?: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeData = await fetchStoreData(container)
  try {
    let sellerEmail: string | undefined
    let sellerName = "Seller"
    let orderLabel = event.data.order_id || ""
    let amountText = ""
    if (event.data.id) {
      const { data: [payout] } = await query.graph({
        entity: "payout",
        fields: ["id", "amount", "currency_code", "order.display_id", "payout_account.seller.email", "payout_account.seller.name"],
        filters: { id: event.data.id },
      })
      sellerEmail = payout?.payout_account?.seller?.email
      sellerName = payout?.payout_account?.seller?.name || sellerName
      orderLabel = payout?.order?.display_id || orderLabel
      if (payout?.amount != null) {
        amountText = `${(payout.currency_code || "").toUpperCase()} ${(Number(payout.amount) / 100).toFixed(2)}`
      }
    }
    if (!sellerEmail && event.data.order_id) {
      const { data: [order] } = await query.graph({
        entity: "order",
        fields: ["display_id", "seller.email", "seller.name"],
        filters: { id: event.data.order_id },
      })
      sellerEmail = order?.seller?.email
      sellerName = order?.seller?.name || sellerName
      orderLabel = order?.display_id || orderLabel
    }
    if (!sellerEmail) return
    await notificationService.createNotifications({
      to: sellerEmail,
      channel: "email",
      template: ResendNotificationTemplates.SELLER_PAYOUT_SUCCEEDED,
      content: { subject: `Payout succeeded${orderLabel ? ` — order #${orderLabel}` : ""}` },
      data: {
        data: {
          title: "Payout successful",
          body: `Hi ${sellerName},\n\nYour payout${amountText ? ` of ${amountText}` : ""}${orderLabel ? ` for order #${orderLabel}` : ""} was processed successfully.`,
          cta_label: "Open vendor panel",
          cta_url: buildHostAddress(Hosts.VENDOR_PANEL, "/").toString(),
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    })
  } catch (error) {
    console.error("seller payout succeeded email failed", error)
  }
}

export const config: SubscriberConfig = {
  event: PayoutWorkflowEvents.SUCCEEDED,
  context: { subscriberId: "seller-payout-succeeded-handler-resend" },
}
