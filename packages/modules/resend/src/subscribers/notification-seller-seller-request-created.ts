import { Modules } from "@medusajs/framework/utils"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

import {
  RequestDTO,
  SellerRequest,
  fetchStoreData,
  Hosts,
  buildHostAddress,
} from "@mercurjs/framework"
import { ResendNotificationTemplates } from "../providers/resend"

export default async function requestCreatedSellerAccountUpdatesNotifyHandler({
  event,
  container,
}: SubscriberArgs<RequestDTO>) {
  const requestData = event.data.data as {
    provider_identity_id: string
    member: { name: string }
    seller?: { email?: string; name?: string }
  }

  if (event.data.type !== "seller") {
    return
  }

  const notificationService = container.resolve(Modules.NOTIFICATION)
  const storeData = await fetchStoreData(container)
  const verifyLink = buildHostAddress(Hosts.VENDOR_PANEL, "/").toString()

  await notificationService.createNotifications([
    {
      to: requestData.provider_identity_id,
      channel: "email",
      template: ResendNotificationTemplates.SELLER_VERIFY_EMAIL_TEMPLATE,
      content: {
        subject: `Verify your email — ${storeData.store_name}`,
      },
      data: {
        data: {
          user_name: requestData.member?.name || "Seller",
          link: verifyLink,
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    },
    {
      to: requestData.provider_identity_id,
      channel: "email",
      template: ResendNotificationTemplates.SELLER_ACCOUNT_UPDATES_SUBMISSION,
      content: {
        subject: "Your submission has been received",
      },
      data: {
        data: {
          user_name: requestData.member?.name || "Seller",
          store_name: storeData.store_name,
          storefront_url: storeData.storefront_url,
        },
      },
    },
  ])
}

export const config: SubscriberConfig = {
  event: SellerRequest.CREATED,
  context: {
    subscriberId:
      "request-created-seller-account-updates-notify-handler-resend",
  },
}
