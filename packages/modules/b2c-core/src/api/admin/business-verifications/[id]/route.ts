import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  SELLER_VERIFICATIONS_MODULE,
  SellerVerificationsModuleService
} from '../../../../modules/seller-verifications'

import { computeDuplicateSignals, loadSellerSummaries } from '../helpers'

/**
 * @oas [get] /admin/business-verifications/{id}
 * operationId: "AdminGetBusinessVerification"
 * summary: "One verification with its seller and freshly computed duplicate signals"
 * x-authenticated: true
 * tags:
 *   - Admin Business Verifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: SellerVerificationsModuleService = req.scope.resolve(
    SELLER_VERIFICATIONS_MODULE
  )
  const [row] = await service.listSellerVerifications({ id: req.params.id })
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Business verification not found')
  }
  const sellers = await loadSellerSummaries(req.scope, [row.seller_id])
  const seller = sellers.get(row.seller_id) ?? null

  // Signals are computed on read so the reviewer always sees the current
  // picture; the snapshot the decision was made against is stamped on
  // review (see ./review).
  const duplicate_signals = seller
    ? await computeDuplicateSignals(req.scope, {
        seller,
        legal_name: row.legal_name
      })
    : null

  res.status(200).json({
    business_verification: { ...row, seller, duplicate_signals }
  })
}
