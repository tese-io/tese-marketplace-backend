import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  isVendorSourcingConfigured,
  listSourcingRequests,
} from '../../../utils/tese-vendor-sourcing'

/**
 * GET /admin/vendor-sourcing-requests
 * Query: statuses (comma list), kind, limit
 *
 * The Mercur admin "Sourcing requests" queue — proxies the tese-backend
 * ops API with the service key. Medusa admin auth guards this route.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!isVendorSourcingConfigured()) {
    return res
      .status(503)
      .json({ message: 'Vendor sourcing not configured (TESE_BACKEND_API_KEY)', requests: [] })
  }

  try {
    const statuses =
      typeof req.query.statuses === 'string' && req.query.statuses.trim()
        ? req.query.statuses.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined
    const kind = typeof req.query.kind === 'string' ? req.query.kind.trim() : undefined
    const rawLimit = Number(req.query.limit)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : undefined

    const requests = await listSourcingRequests({ statuses, kind, limit })
    return res.json({ requests, count: requests.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Vendor sourcing list failed'
    logger.error(`Admin vendor-sourcing list: ${message}`)
    return res.status(502).json({ message, requests: [] })
  }
}
