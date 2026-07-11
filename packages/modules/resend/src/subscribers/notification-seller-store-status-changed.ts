import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ResendNotificationTemplates } from "../providers/resend"
import { Hosts, SellerEvents, StoreStatus, buildHostAddress, fetchStoreData } from "@mercurjs/framework"

export default async function sellerStoreStatusChangedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; store_status?: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeData = await fetchStoreData(container)
  const status = event.data.store_status
  if (status !== StoreStatus.SUSPENDED && status !== StoreStatus.ACTIVE) return
  try {
    const { data: [seller] } = await query.graph({
      entity: "seller",
      fields: ["id", "email", "name", "store_status"],
      filters: { id: event.data.id },
    })
    if (!seller?.email) return
    const isSuspended = status === StoreStatus.SUSPENDED
    await notificationService.createNotifications({
      to: seller.email,
      channel: "email",
      template: isSuspended
        ? ResendNotificationTemplates.SELLER_STORE_SUSPENDED
        : ResendNotificationTemplates.SELLER_STORE_REACTIVATED,
      content: {
        subject: isSuspended
          ? "Your store has been suspended"
          : "Your store has been reactivated",
      },
      data: {
        data: {
          title: isSuspended ? "Store suspended" : "Store reactivated",
          body: isSuspended
            ? `Hi ${seller.name || "there"},\n\nYour store status is now SUSPENDED. Existing listings may be hidden until the status is restored.`
            : `Hi ${seller.name || "there"},\n\nYour store is ACTIVE again. You can resume selling on the marketplace.`,
          cta_label: "Open vendor panel",
          cta_url: buildHostAddress(Hosts.VENDOR_PANEL, "/").toString(),
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    })
  } catch (error) {
    console.error("seller store status email failed", error)
  }
}

export const config: SubscriberConfig = {
  event: SellerEvents.STORE_STATUS_CHANGED,
  context: { subscriberId: "seller-store-status-changed-handler-resend" },
}
