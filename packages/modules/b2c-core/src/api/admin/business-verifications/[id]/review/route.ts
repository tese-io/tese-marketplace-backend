import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  SELLER_VERIFICATIONS_MODULE,
  SellerVerificationsModuleService
} from '../../../../../modules/seller-verifications'
import { attachSellerAndArchiveShell, MergeRecord } from '../../../../../utils/seller-attach'

import { computeDuplicateSignals, loadSellerSummaries } from '../../helpers'
import { AdminReviewBusinessVerificationType } from '../../validators'

/**
 * @oas [post] /admin/business-verifications/{id}/review
 * operationId: "AdminReviewBusinessVerification"
 * summary: "Approve (recording the verification method, optionally attaching the applicant to an existing store) or decline with a written reason"
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminReviewBusinessVerification"
 * tags:
 *   - Admin Business Verifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminReviewBusinessVerificationType>,
  res: MedusaResponse
) => {
  const service: SellerVerificationsModuleService = req.scope.resolve(
    SELLER_VERIFICATIONS_MODULE
  )
  const [row] = await service.listSellerVerifications({ id: req.params.id })
  if (!row) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Business verification not found')
  }
  if (row.status !== 'pending') {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'This verification has already been reviewed'
    )
  }

  const { decision, reviewer_note, verification_method, attach_to_seller_id } =
    req.validatedBody
  const reviewer = req.auth_context.actor_id

  // Snapshot what the reviewer saw — the audit trail Kuzi asked for.
  const sellers = await loadSellerSummaries(req.scope, [row.seller_id])
  const seller = sellers.get(row.seller_id)
  const duplicate_signals = seller
    ? await computeDuplicateSignals(req.scope, { seller, legal_name: row.legal_name })
    : null

  // B-26: the reviewer confirmed this is an existing store. Move the
  // applicant over and archive the shell; the verification follows them.
  let merge_record: MergeRecord | null = null
  let effectiveSellerId = row.seller_id
  if (decision === 'approve' && attach_to_seller_id) {
    merge_record = await attachSellerAndArchiveShell(req.scope, {
      sourceSellerId: row.seller_id,
      targetSellerId: attach_to_seller_id,
      verificationId: row.id,
      reviewer
    })
    effectiveSellerId = attach_to_seller_id
  }

  const [updated] = await service.updateSellerVerifications({
    selector: { id: row.id },
    data: {
      seller_id: effectiveSellerId,
      status: decision === 'approve' ? 'verified' : 'rejected',
      verification_method: decision === 'approve' ? verification_method ?? null : null,
      reviewed_by: reviewer,
      reviewed_at: new Date(),
      reviewer_note: reviewer_note?.trim() || null,
      duplicate_signals: duplicate_signals as Record<string, unknown> | null,
      merge_record: merge_record as Record<string, unknown> | null
    }
  })

  const effectiveSeller = merge_record
    ? (await loadSellerSummaries(req.scope, [effectiveSellerId])).get(effectiveSellerId) ?? null
    : seller ?? null

  res.status(200).json({ business_verification: { ...updated, seller: effectiveSeller } })
}
