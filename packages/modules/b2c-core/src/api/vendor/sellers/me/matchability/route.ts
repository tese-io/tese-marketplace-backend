import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import sellerProductLink from "../../../../../links/seller-product"
import { fetchSellerByAuthActorId } from "../../../../../shared/infra/http/utils"
import {
  computeMatchability,
  gatherMatchabilitySignals,
} from "../../../../../utils/matchability"

/**
 * @oas [get] /vendor/sellers/me/matchability
 * operationId: "VendorGetSellerMatchability"
 * summary: "How buyers find you"
 * description: >
 *   The seller's matchability score (0-100) with per-signal status —
 *   computed from the same signals the marketplace catalog sync and
 *   the recommendation engine read, so the widget shows exactly what
 *   matching sees.
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             score:
 *               type: number
 *             tese_verified:
 *               type: boolean
 *             signals:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   key:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [ok, partial, missing, unknown]
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
  const seller = await fetchSellerByAuthActorId(
    req.auth_context?.actor_id,
    req.scope
  )

  const signals = await gatherMatchabilitySignals(
    req.scope,
    seller.id,
    sellerProductLink.entryPoint as string
  )

  res.json(computeMatchability(signals))
}
