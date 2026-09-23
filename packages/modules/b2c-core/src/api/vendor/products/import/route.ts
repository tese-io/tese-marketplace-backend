import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import {
  checkSellerSubmissionCompleteness,
  formatIncompleteMessage
} from '../../../../utils/seller-completeness'
import { toImportReport } from '../../../../utils/product-import-validation'
import {
  importSellerProductsWorkflow,
  validateSellerProductsImportWorkflow
} from '../../../../workflows/seller/workflows'

/**
 * B-11 two-phase import:
 *   POST /vendor/products/import?dry_run=true → parse + validate ONLY,
 *     returns {report, profile_missing} for the panel's confirm screen
 *     (nothing is created, nothing throws on row errors).
 *   POST /vendor/products/import → the real commit. Fails atomically on
 *     row errors, and the D-04 gate applies (bulk uploads are
 *     submissions; prices are enforced per row by the validation).
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const input = (req as any).file

  if (!input) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'No file was uploaded for importing'
    )
  }

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const dryRun = String(req.query.dry_run || '') === 'true'
  const fileContent = input.buffer.toString('utf-8')

  const completeness = await checkSellerSubmissionCompleteness(
    req.scope,
    seller.id,
    { skipPrice: true }
  )

  if (dryRun) {
    const { result } = await validateSellerProductsImportWorkflow.run({
      container: req.scope,
      input: { file_content: fileContent }
    })
    return res.status(200).json({
      report: toImportReport(result),
      profile_missing: completeness.missing
    })
  }

  if (!completeness.ok) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      formatIncompleteMessage(completeness.missing)
    )
  }

  const { result: products } = await importSellerProductsWorkflow.run({
    container: req.scope,
    input: {
      file_content: fileContent,
      seller_id: seller.id,
      submitter_id: req.auth_context.actor_id
    }
  })

  res.status(201).json({ products })
}
