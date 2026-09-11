import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  isVendorSourcingConfigured,
  patchSourcingRequest,
} from '../../../../utils/tese-vendor-sourcing'

/**
 * POST /admin/vendor-sourcing-requests/:id
 * Body: { status?, resolutionNotes?, vendorsAdded? }
 *
 * Status transitions from the admin queue. POST (not PATCH) because the
 * Medusa admin SDK client speaks POST for mutations by default.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<{
    status?: string
    resolutionNotes?: string
    vendorsAdded?: number
  }>,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!isVendorSourcingConfigured()) {
    return res
      .status(503)
      .json({ message: 'Vendor sourcing not configured (TESE_BACKEND_API_KEY)' })
  }

  try {
    const request = await patchSourcingRequest(req.params.id, req.body || {})
    return res.json({ request })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Vendor sourcing update failed'
    logger.error(`Admin vendor-sourcing patch: ${message}`)
    return res.status(502).json({ message })
  }
}
