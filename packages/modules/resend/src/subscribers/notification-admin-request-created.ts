import { Modules } from "@medusajs/framework/utils"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

import {
  HumanizeTypes,
  RequestDTO,
  RequestUpdated,
  fetchAdminEmails,
  Hosts,
  buildHostAddress,
  fetchStoreData,
} from "@mercurjs/framework"
import { ResendNotificationTemplates } from "../providers/resend"

const requestTypeToAdminPath: Record<string, string> = {
  seller: "/requests/seller",
  product: "/requests/product",
  product_update: "/requests/product_update",
  product_category: "/requests/product_category",
  product_collection: "/requests/product_collection",
  product_type: "/requests/product_type",
  product_tag: "/requests/product_tag",
  review_remove: "/requests/review_remove",
}

export default async function requestCreatedAdminNotifyHandler({
  event,
  container,
}: SubscriberArgs<RequestDTO>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const {
    data: { type, data },
  } = event

  const admins = await fetchAdminEmails(container)
  if (!admins.length) {
    return
  }

  const storeData = await fetchStoreData(container)
  const requestLabel = (HumanizeTypes as Record<string, string>)[type] || type
  const requestName =
    (data as any)?.seller?.name ||
    (data as any)?.member?.name ||
    (data as any)?.title ||
    (data as any)?.name ||
    "A seller"

  // Keep dedicated seller template for seller onboarding; use generic for all other request types
  if (type === "seller") {
    const notifications = admins.map((email) => ({
      to: email,
      channel: "email" as const,
      template: ResendNotificationTemplates.ADMIN_SELLER_REQUEST_CREATED,
      content: {
        subject: "Seller requested to join the platform",
      },
      data: {
        data: {
          seller_name: (data as any)?.seller?.name || requestName,
          request_address: buildHostAddress(
            Hosts.BACKEND,
            requestTypeToAdminPath.seller
          ).toString(),
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    }))
    await notificationService.createNotifications(notifications)
    return
  }

  const path = requestTypeToAdminPath[type] || `/requests/${type}`
  const notifications = admins.map((email) => ({
    to: email,
    channel: "email" as const,
    template: ResendNotificationTemplates.ADMIN_REQUEST_CREATED,
    content: {
      subject: `New ${requestLabel} request`,
    },
    data: {
      data: {
        request_type: requestLabel,
        seller_name: requestName,
        store_name: storeData.store_name,
        storefront_url: storeData.storefront_url,
        request_address: buildHostAddress(Hosts.BACKEND, path).toString(),
      },
    },
  }))

  await notificationService.createNotifications(notifications)
}

export const config: SubscriberConfig = {
  event: RequestUpdated.CREATED,
  context: {
    subscriberId: "request-created-admin-notify-handler-resend",
  },
}
