import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import {
  pickLatestApplication,
  toApplicationWire,
  SellerApplicationRow,
} from "./helpers"

/**
 * @oas [get] /vendor/sellers/application
 * operationId: "VendorGetSellerApplication"
 * summary: "Get my seller application status"
 * description: >
 *   Returns the state of the caller's seller-creation application
 *   (received / approved / declined, with the reviewer's reason on
 *   decline). Reachable by an authenticated identity that is not yet an
 *   approved seller — this is what the panel's pending-approval page
 *   reads instead of surfacing a raw 403.
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             application:
 *               nullable: true
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [received, under_review, approved, declined]
 *                 submitted_at:
 *                   type: string
 *                   nullable: true
 *                 reviewed_at:
 *                   type: string
 *                   nullable: true
 *                 seller_name:
 *                   type: string
 *                   nullable: true
 *                 reviewer_note:
 *                   type: string
 *                 claim:
 *                   type: boolean
 * tags:
 *   - Vendor Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing authentication context"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [identity],
  } = await query.graph({
    entity: "provider_identity",
    fields: ["id"],
    filters: { auth_identity_id: authIdentityId },
  })

  if (!identity) {
    return res.json({ application: null })
  }

  const { data: requests } = await query.graph({
    entity: "request",
    fields: [
      "id",
      "status",
      "created_at",
      "updated_at",
      "reviewer_id",
      "reviewer_note",
      "data",
    ],
    filters: { submitter_id: identity.id, type: "seller" },
  })

  return res.json({
    application: toApplicationWire(
      pickLatestApplication(requests as SellerApplicationRow[] | undefined)
    ),
  })
}
