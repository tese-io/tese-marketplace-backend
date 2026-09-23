import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { SellerRequest } from "@mercurjs/framework";

import { SELLER_MODULE } from "../modules/seller";
import {
  extractEmailDomain,
  extractWebsiteHost,
  isVendorClaimsConfigured,
  lookupVendorDuplicates,
} from "../utils/tese-vendor-claims";

/**
 * B-01/B-07 — duplicate signals for the seller approval queue.
 *
 * Fires after the pending seller request row exists (the requests module
 * subscriber on TO_CREATE persists it, then its workflow emits CREATED).
 * Asks tese-backend for everything already known under the applicant's
 * email domain (AI-discovered candidate + existing tese organisations),
 * scans Mercur's own sellers for the same canonical domain, and stamps
 * the combined result into request.data.duplicate_signals so the
 * reviewer sees "this company may already exist" before deciding
 * claim-vs-create.
 *
 * Strictly best-effort: any failure stamps { status: 'unavailable' } and
 * never blocks or fails the signup path.
 */

type DuplicateSignals = {
  checked_at: string;
  status?: "unavailable";
  error?: string;
  domain?: string | null;
  domain_usable?: boolean;
  reason?: string | null;
  candidate?: unknown;
  tenants?: Array<{
    id: string;
    name: string;
    matched_on: string;
    has_tese_seller: boolean;
  }>;
  sellers?: Array<{
    id: string;
    name: string;
    handle: string;
    matched_on: string;
  }>;
};

export default async function sellerCreationRequestCreatedDuplicatesHandler({
  event,
  container,
}: SubscriberArgs<{
  data?: { seller?: { name?: string; email?: string; website?: string }; member?: { email?: string } };
  type?: string;
  submitter_id?: string;
}>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const input = event.data;

  if (input?.type !== "seller" || !input.submitter_id) {
    return;
  }

  // Strictly best-effort end to end: even the request lookup must not
  // reject the handler (event-bus retries would re-run it pointlessly).
  let request: { id: string; data: unknown; status: string } | undefined;
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "request",
      fields: ["id", "data", "status"],
      filters: {
        submitter_id: input.submitter_id,
        type: "seller",
      },
    });
    // Re-application after a rejection means several rows can exist —
    // stamp the PENDING one.
    request = (data || []).find(
      (r: { status?: string }) => r?.status === "pending"
    );
  } catch (error) {
    logger.warn(
      `Duplicate-signals: request lookup failed for submitter ${input.submitter_id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return;
  }

  if (!request || request.status !== "pending") {
    return;
  }

  let signals: DuplicateSignals = { checked_at: new Date().toISOString() };

  try {
    if (!isVendorClaimsConfigured()) {
      signals = {
        ...signals,
        status: "unavailable",
        error: "TESE_BACKEND_API_KEY not configured",
      };
    } else {
      const email = input.data?.member?.email || input.data?.seller?.email;
      const lookup = await lookupVendorDuplicates({ email });

      // Local seller scan — data access only; the canonical domain comes
      // from tese-backend so both sides match on exactly the same key.
      const sellers: DuplicateSignals["sellers"] = [];
      let tenants: DuplicateSignals["tenants"] = [];
      if (lookup.domain_usable && lookup.domain) {
        const sellerService: any = container.resolve(SELLER_MODULE);
        const allSellers = await sellerService.listSellers(
          {},
          { select: ["id", "name", "handle", "email", "website"], take: 1000 }
        );
        for (const s of allSellers || []) {
          if (extractEmailDomain(s.email) === lookup.domain) {
            sellers.push({
              id: s.id,
              name: s.name,
              handle: s.handle,
              matched_on: "seller_email_domain",
            });
          } else if (extractWebsiteHost(s.website) === lookup.domain) {
            sellers.push({
              id: s.id,
              name: s.name,
              handle: s.handle,
              matched_on: "seller_website",
            });
          }
        }

        tenants = await Promise.all(
          (lookup.tenants || []).map(async (t) => {
            const linked = await sellerService.listSellers(
              { handle: `tese-${t.id}` },
              { select: ["id"], take: 1 }
            );
            return { ...t, has_tese_seller: Boolean(linked?.length) };
          })
        );
      }

      signals = {
        ...signals,
        domain: lookup.domain,
        domain_usable: lookup.domain_usable,
        reason: lookup.reason,
        candidate: lookup.candidate,
        tenants,
        sellers,
      };
    }
  } catch (error) {
    signals = {
      ...signals,
      status: "unavailable",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    // The requests module service is resolved by its registration key —
    // b2c-core deliberately has no compile-time dependency on
    // @mercurjs/requests. Same merge semantics as updateRequestDataStep.
    const requestsService: any = container.resolve("requests");
    await requestsService.updateRequests({
      id: request.id,
      data: {
        ...(request.data as Record<string, unknown>),
        duplicate_signals: signals,
      },
    });
    logger.info(
      `Seller request ${request.id}: duplicate signals stamped (` +
        `candidate=${signals.candidate ? "yes" : "no"}, ` +
        `tenants=${signals.tenants?.length ?? 0}, sellers=${signals.sellers?.length ?? 0}` +
        `${signals.status === "unavailable" ? ", UNAVAILABLE: " + signals.error : ""})`
    );
  } catch (error) {
    logger.warn(
      `Seller request ${request.id}: could not stamp duplicate signals: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const config: SubscriberConfig = {
  event: SellerRequest.CREATED,
  context: {
    subscriberId: "seller-creation-request-created-duplicates-handler",
  },
};
