import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  isVendorCoverageConfigured,
  searchActivities,
} from '../../../../utils/tese-vendor-coverage'

/**
 * GET /vendor/activities/search
 * Query: q (text), industry_vertical, domain, limit
 *
 * Autocomplete for the vendor-panel "Add activity" picker. Read-through
 * proxy to tese-backend's /v3/nbs/activities/search.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!isVendorCoverageConfigured()) {
    return res
      .status(503)
      .json({ message: 'Activity search not configured', activities: [] })
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined
  const industry_vertical =
    typeof req.query.industry_vertical === 'string'
      ? req.query.industry_vertical.trim()
      : undefined
  const domain =
    typeof req.query.domain === 'string' ? req.query.domain.trim() : undefined
  const rawLimit = Number(req.query.limit)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 50)
    : 20

  try {
    const activities = await searchActivities({ q, industry_vertical, domain, limit })
    return res.json({ activities, count: activities.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Activity search failed'
    logger.error(`Vendor activities/search: ${message}`)
    return res.status(502).json({ message, activities: [] })
  }
}
