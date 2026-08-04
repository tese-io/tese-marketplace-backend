import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import {
  deactivateSellerCoverage,
  isVendorCoverageConfigured,
} from '../../../../utils/tese-vendor-coverage'

/**
 * DELETE /vendor/coverage/:activity_code
 * Soft-hide (deactivate) one activity's coverage for the seller.
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!isVendorCoverageConfigured()) {
    return res.status(503).json({ message: 'Vendor coverage not configured' })
  }

  const rawCode = String(req.params.activity_code || '').trim()
  if (!rawCode) {
    return res.status(400).json({ message: 'activity_code is required' })
  }

  try {
    const seller = await fetchSellerByAuthActorId(
      req.auth_context.actor_id,
      req.scope
    )
    const result = await deactivateSellerCoverage(seller.id, rawCode)
    return res.status(200).json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Vendor coverage delete failed'
    logger.error(`Vendor coverage DELETE: ${message}`)
    return res.status(502).json({ message })
  }
}
