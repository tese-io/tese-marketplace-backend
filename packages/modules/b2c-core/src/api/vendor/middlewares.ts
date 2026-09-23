import { MiddlewareRoute, authenticate } from "@medusajs/framework";

import {
  checkSellerApproved,
  storeActiveGuard,
} from "../../shared/infra/http/middlewares";
import { unlessBaseUrl } from "../../shared/infra/http/utils";
import { vendorAttributeMiddlewares } from "./attributes/middlewares";
import { vendorCampaignsMiddlewares } from "./campaigns/middlewares";
import { vendorCors } from "./cors";
import { vendorCustomerGroupsMiddlewares } from "./customer-groups/middlewares";
import { vendorCustomersMiddlewares } from "./customers/middlewares";
import { vendorFulfillmentProvidersMiddlewares } from "./fulfillment-providers/middlewares";
import { vendorFulfillmentSetsMiddlewares } from "./fulfillment-sets/middlewares";
import { vendorInventoryItemsMiddlewares } from "./inventory-items/middlewares";
import { vendorInvitesMiddlewares } from "./invites/middlewares";
import { vendorMeMiddlewares } from "./me/middlewares";
import { vendorMembersMiddlewares } from "./members/middlewares";
import { vendorNotificationMiddlewares } from "./notifications/middlewares";
import { vendorOrderMiddlewares } from "./orders/middlewares";
import { vendorPayoutAccountMiddlewares } from "./payout-account/middlewares";
import { vendorPayoutMiddlewares } from "./payouts/middlewares";
import { vendorPriceListsMiddlewares } from "./price-lists/middlewares";
import { vendorPricePreferencesRoutesMiddlewares } from "./price-preferences/middlewares";
import { vendorProductCategoriesMiddlewares } from "./product-categories/middlewares";
import { vendorProductCollectionsMiddlewares } from "./product-collections/middlewares";
import { vendorProductTagsMiddlewares } from "./product-tags/middlewares";
import { vendorProductTypesMiddlewares } from "./product-types/middlewares";
import { vendorProductsMiddlewares } from "./products/middlewares";
import { vendorPromotionsMiddlewares } from "./promotions/middlewares";
import { vendorRegionsMiddlewares } from "./regions/middlewares";
import { vendorReservationsMiddlewares } from "./reservations/middlewares";
import { vendorReturnsMiddlewares } from "./returns/middlewares";
import { vendorSalesChannelMiddlewares } from "./sales-channels/middlewares";
import { vendorSellerCertificationsMiddlewares } from "./seller-certifications/middlewares";
import { vendorSellersMiddlewares } from "./sellers/middlewares";
import { vendorShippingOptionsMiddlewares } from "./shipping-options/middlewares";
import { vendorShippingProfilesMiddlewares } from "./shipping-profiles/middlewares";
import { vendorStatisticsMiddlewares } from "./statistics/middlewares";
import { vendorStockLocationsMiddlewares } from "./stock-locations/middlewares";
import { vendorStoresMiddlewares } from "./stores/middlewares";
import { vendorUploadMiddlewares } from "./uploads/middlewares";

/**
 * AUTH-CRITICAL. The ONLY /vendor/* paths exempt from the approved-seller
 * gate: signup, tese SSO provisioning, invite acceptance, and the B-05
 * application-status read. Exact-match anchored — anything else under
 * /vendor/* stays behind checkSellerApproved. Guarded by
 * __tests__/seller-gate-exempt.unit.spec.ts; change both together.
 */
export const SELLER_GATE_EXEMPT_RE =
  /^\/vendor\/(sellers(?:\/tese|\/application)?|invites\/accept)$/;

export const vendorMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/vendor*",
    middlewares: [vendorCors],
  },
  /**
   * @desc Here we are authenticating the seller routes
   * except for the route for creating a seller
   * and the route for accepting a member invite
   */
  {
    matcher: "/vendor/sellers",
    method: ["POST"],
    middlewares: [
      authenticate("seller", ["bearer", "session"], {
        allowUnregistered: true,
      }),
    ],
  },
  {
    // tese seller SSO provisioning: the claimable (not-yet-a-member) identity
    // must reach this route to create/link its seller + member.
    matcher: "/vendor/sellers/tese",
    method: ["POST"],
    middlewares: [
      authenticate("seller", ["bearer", "session"], {
        allowUnregistered: true,
      }),
    ],
  },
  {
    // B-05 application status: an applicant whose seller is not yet
    // approved has an auth identity but no actor — allowUnregistered
    // lets them read their own application state.
    matcher: "/vendor/sellers/application",
    method: ["GET"],
    middlewares: [
      authenticate("seller", ["bearer", "session"], {
        allowUnregistered: true,
      }),
    ],
  },
  {
    matcher: "/vendor/invites/accept",
    method: ["POST"],
    middlewares: [
      authenticate("seller", ["bearer", "session"], {
        allowUnregistered: true,
      }),
    ],
  },
  {
    matcher: "/vendor/*",
    middlewares: [
      unlessBaseUrl(
        SELLER_GATE_EXEMPT_RE,
        checkSellerApproved(["bearer", "session"])
      ),
      unlessBaseUrl(
        SELLER_GATE_EXEMPT_RE,
        authenticate("seller", ["bearer", "session"], {
          allowUnregistered: false,
        })
      ),
      unlessBaseUrl(
        // matrix: suspended sellers must still reach the support chat
        /^\/vendor\/(sellers|orders|fulfillment|invites\/accept|matrix)/,
        storeActiveGuard
      ),
    ],
  },
  ...vendorMeMiddlewares,
  ...vendorSellersMiddlewares,
  ...vendorSellerCertificationsMiddlewares,
  ...vendorMembersMiddlewares,
  ...vendorProductsMiddlewares,
  ...vendorInvitesMiddlewares,
  ...vendorFulfillmentSetsMiddlewares,
  ...vendorStockLocationsMiddlewares,
  ...vendorShippingOptionsMiddlewares,
  ...vendorPayoutAccountMiddlewares,
  ...vendorInventoryItemsMiddlewares,
  ...vendorPayoutMiddlewares,
  ...vendorOrderMiddlewares,
  ...vendorInventoryItemsMiddlewares,
  ...vendorSalesChannelMiddlewares,
  ...vendorCustomersMiddlewares,
  ...vendorCustomerGroupsMiddlewares,
  ...vendorStoresMiddlewares,
  ...vendorProductTagsMiddlewares,
  ...vendorProductTypesMiddlewares,
  ...vendorProductCategoriesMiddlewares,
  ...vendorProductCollectionsMiddlewares,
  ...vendorUploadMiddlewares,
  ...vendorPromotionsMiddlewares,
  ...vendorReservationsMiddlewares,
  ...vendorPriceListsMiddlewares,
  ...vendorPromotionsMiddlewares,
  ...vendorCampaignsMiddlewares,
  ...vendorStatisticsMiddlewares,
  ...vendorFulfillmentProvidersMiddlewares,
  ...vendorReturnsMiddlewares,
  ...vendorShippingProfilesMiddlewares,
  ...vendorRegionsMiddlewares,
  ...vendorNotificationMiddlewares,
  ...vendorAttributeMiddlewares,
  ...vendorPricePreferencesRoutesMiddlewares,
];
