import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

import {
  MemberRole,
  RequestDTO,
  SellerAccountRequestUpdatedEvent,
} from "@mercurjs/framework";

import { SELLER_MODULE } from "../modules/seller";
import {
  attachTeseSellerMemberWorkflow,
  createSellerWorkflow,
  linkTeseSellerWorkflow,
} from "../workflows";
import { notifySellerLinked } from "../utils/tese-vendor-claims";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * B-01 — the single claim-vs-create decision point.
 *
 * When the reviewer accepted the request WITH a claim target
 * (data.claim_target_seller_id, stamped by the admin review route), the
 * applicant is attached as a member of the EXISTING seller instead of a
 * second store being created. Otherwise: create, exactly as before.
 *
 * Either way, tese-backend is told a store now exists for this vendor
 * (best-effort) so the AI-discovered candidate row advances to
 * `onboarded` — a create despite a candidate signal still closes the
 * loop and stops future re-invites.
 */
export default async function sellerCreationRequestAcceptedHandler({
  event,
  container,
}: SubscriberArgs<RequestDTO>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const request = event.data;
  const data = request.data as Record<string, any>;

  const claimTargetSellerId: string | undefined = data.claim_target_seller_id;
  const signalsDomain: string | null = data.duplicate_signals?.domain ?? null;
  const teseTenantId: string | null = data.tese_tenant_id ?? null;

  if (claimTargetSellerId) {
    const sellerService: any = container.resolve(SELLER_MODULE);
    const seller = await sellerService.retrieveSeller(claimTargetSellerId);

    const memberEmail: string | undefined = data.member?.email;
    const existingMembers = memberEmail
      ? await sellerService.listMembers({
          seller_id: seller.id,
          email: memberEmail,
        })
      : [];

    if (existingMembers?.length) {
      // The exact email is already a member — just point the auth
      // identity at it (re-application from the same person).
      await linkTeseSellerWorkflow.run({
        container,
        input: {
          auth_identity_id: data.auth_identity_id as string,
          member_id: existingMembers[0].id,
        },
      });
    } else {
      await attachTeseSellerMemberWorkflow.run({
        container,
        input: {
          member: {
            ...(data.member ?? {}),
            seller_id: seller.id,
            // New arrivals join as MEMBER; promotion is an existing
            // owner/admin action, never automatic on a claim.
            role: MemberRole.MEMBER,
          },
          auth_identity_id: data.auth_identity_id as string,
        },
      });
    }

    // SSO-originated claim: converge every future tese login for this
    // tenant onto the claimed store by binding the tenant key to it.
    if (teseTenantId && seller.metadata?.tese_tenant_id !== teseTenantId) {
      await sellerService.updateSellers({
        id: seller.id,
        handle: `tese-${teseTenantId}`,
        metadata: {
          ...(seller.metadata ?? {}),
          tese_tenant_id: teseTenantId,
          // The old handle is a public storefront URL — keep it findable.
          previous_handle: seller.handle,
        },
      });
    }

    const notify = await notifySellerLinked({
      domain: signalsDomain,
      teseTenantId,
      sellerId: seller.id,
      sellerHandle: seller.handle,
      via: "seller_claim",
    });
    if (notify.conflict) {
      logger.warn(
        `Seller claim ${request.id}: tese candidate already linked to a DIFFERENT seller — duplicate to report (${notify.error})`
      );
    }

    logger.info(
      `Seller creation request accepted as CLAIM: ${request.id}, seller: ${seller.id}`
    );
    return;
  }

  const { result: seller } = await createSellerWorkflow.run({
    container,
    input: {
      member: request.data.member as any,
      seller: request.data.seller as any,
      auth_identity_id: request.data.auth_identity_id as string,
    },
  });

  const notify = await notifySellerLinked({
    domain: signalsDomain,
    teseTenantId,
    sellerId: seller.id,
    sellerHandle: (seller as any).handle ?? null,
    via: "seller_create",
  });
  if (notify.conflict) {
    logger.warn(
      `Seller create ${request.id}: tese candidate already linked to a DIFFERENT seller — duplicate to report (${notify.error})`
    );
  }

  logger.info(
    `Seller creation request accepted: ${request.id}, seller: ${seller.id}`
  );
}

export const config: SubscriberConfig = {
  event: SellerAccountRequestUpdatedEvent.ACCEPTED,
  context: {
    subscriberId: "seller-creation-request-accepted-handler",
  },
};
