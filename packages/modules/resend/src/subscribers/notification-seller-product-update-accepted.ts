import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  ProductUpdateRequestUpdatedEvent,
  fetchStoreData,
} from "@mercurjs/framework";
import { ResendNotificationTemplates } from "../providers/resend";

export default async function sellerProductUpdateAcceptedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [productRequest],
  } = await query.graph({
    entity: "request",
    fields: ["*"],
    filters: { id: event.data.id },
  });

  if (!productRequest || productRequest.type !== "product_update") {
    return;
  }
  if (productRequest.reviewer_id === "system") {
    return;
  }

  const {
    data: [member],
  } = await query.graph({
    entity: "member",
    fields: ["*"],
    filters: { id: productRequest.submitter_id },
  });

  if (!member?.email) return;

  const storeData = await fetchStoreData(container);
  const title =
    productRequest.data?.title ||
    productRequest.data?.product_title ||
    "Your product";

  await notificationService.createNotifications({
    to: member.email,
    channel: "email",
    template: ResendNotificationTemplates.SELLER_PRODUCT_APPROVED,
    content: {
      subject: `${storeData.store_name} - Product update approved!`,
    },
    data: {
      data: {
        product_title: title,
        store_name: storeData.store_name,
        storefront_url: storeData.storefront_url,
      },
    },
  });
}

export const config: SubscriberConfig = {
  event: ProductUpdateRequestUpdatedEvent.ACCEPTED,
  context: {
    subscriberId: "seller-product-update-accepted-handler-resend",
  },
};
