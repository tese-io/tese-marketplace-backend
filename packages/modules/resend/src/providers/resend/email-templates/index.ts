import { AdminRequestCreatedEmailTemplate } from "./admin-request-created";
import { AdminSellerRequestCreatedEmailTemplate } from "./admin-seller-request-created";
import { BuyerAccountCreatedEmailTemplate } from "./buyer-account-created";
import { BuyerCancelOrderEmailTemplate } from "./buyer-cancel-order";
import { BuyerNewOrderEmailTemplate } from "./buyer-new-order";
import { BuyerOrderShippedEmailTemplate } from "./buyer-shipped-order";
import { BuyerOrderDeliveredEmailTemplate } from "./buyer-order-delivered";
import { BuyerOrderTransferRequestEmailTemplate } from "./buyer-order-transfer-request";
import { BuyerReturnRequestEmailTemplate } from "./buyer-return-request";
import { BuyerRefundConfirmationEmailTemplate } from "./buyer-refund-confirmation";
import { ForgotPasswordEmailTemplate } from "./forgot-password";
import { NewAdminInviteEmailTemplate } from "./new-admin-invitation";
import { NewSellerInviteEmailTemplate } from "./new-seller-invitation";
import { SellerAccountApprovedEmailTemplate } from "./seller-account-approved";
import { SellerAccountRejectedEmailTemplate } from "./seller-account-rejected";
import { SellerAccountSubmissionEmailTemplate } from "./seller-account-updates-submission";
import { SellerCanceledOrderEmailTemplate } from "./seller-canceled-order";
import { SellerNewOrderEmailTemplate } from "./seller-new-order";
import { SellerPayoutSummaryEmailTemplate } from "./seller-payout-summary";
import { SellerPayoutSucceededEmailTemplate } from "./seller-payout-succeeded";
import { SellerPayoutFailedEmailTemplate } from "./seller-payout-failed";
import { SellerProductApprovedEmailTemplate } from "./seller-product-approved";
import { SellerProductRejectedEmailTemplate } from "./seller-product-rejected";
import { SellerOrderShippingEmailTemplate } from "./seller-shipping-order";
import { SellerReturnRequestEmailTemplate } from "./seller-return-request";
import { SellerStoreSuspendedEmailTemplate } from "./seller-store-suspended";
import { SellerStoreReactivatedEmailTemplate } from "./seller-store-reactivated";
import { SellerTeamInviteEmailTemplate } from "./seller-team-invite";
import { SellerEmailVerifyEmailTemplate } from "./seller-verify-email";

export const emailTemplates: any = {
  buyerAccountCreatedEmailTemplate: BuyerAccountCreatedEmailTemplate,
  buyerCancelOrderEmailTemplate: BuyerCancelOrderEmailTemplate,
  buyerNewOrderEmailTemplate: BuyerNewOrderEmailTemplate,
  buyerOrderShippedEmailTemplate: BuyerOrderShippedEmailTemplate,
  buyerOrderDeliveredEmailTemplate: BuyerOrderDeliveredEmailTemplate,
  buyerOrderTransferRequestEmailTemplate:
    BuyerOrderTransferRequestEmailTemplate,
  buyerReturnRequestEmailTemplate: BuyerReturnRequestEmailTemplate,
  buyerRefundConfirmationEmailTemplate: BuyerRefundConfirmationEmailTemplate,
  forgotPasswordEmailTemplate: ForgotPasswordEmailTemplate,
  sellerAccountApprovedEmailTemplate: SellerAccountApprovedEmailTemplate,
  sellerAccountRejectedEmailTemplate: SellerAccountRejectedEmailTemplate,
  sellerAccountSubmissionEmailTemplate: SellerAccountSubmissionEmailTemplate,
  sellerCanceledOrderEmailTemplate: SellerCanceledOrderEmailTemplate,
  sellerNewOrderEmailTemplate: SellerNewOrderEmailTemplate,
  sellerOrderShippingEmailTemplate: SellerOrderShippingEmailTemplate,
  sellerReturnRequestEmailTemplate: SellerReturnRequestEmailTemplate,
  sellerTeamInviteEmailTemplate: SellerTeamInviteEmailTemplate,
  sellerVerifyEmailTemplate: SellerEmailVerifyEmailTemplate,
  sellerPayoutSucceededEmailTemplate: SellerPayoutSucceededEmailTemplate,
  sellerPayoutFailedEmailTemplate: SellerPayoutFailedEmailTemplate,
  sellerStoreSuspendedEmailTemplate: SellerStoreSuspendedEmailTemplate,
  sellerStoreReactivatedEmailTemplate: SellerStoreReactivatedEmailTemplate,
  newSellerInvitation: NewSellerInviteEmailTemplate,
  newAdminInvitation: NewAdminInviteEmailTemplate,
  sellerProductRejectedEmailTemplate: SellerProductRejectedEmailTemplate,
  sellerProductApprovedEmailTemplate: SellerProductApprovedEmailTemplate,
  adminRequestCreatedEmailTemplate: AdminRequestCreatedEmailTemplate,
  adminSellerRequestCreatedEmailTemplate:
    AdminSellerRequestCreatedEmailTemplate,
  sellerPayoutSummaryEmailTemplate: SellerPayoutSummaryEmailTemplate,
};
