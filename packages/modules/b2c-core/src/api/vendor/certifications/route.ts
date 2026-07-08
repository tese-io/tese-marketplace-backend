import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  fetchCertificationsCatalogue,
  isCertificationsCatalogueConfigured,
} from '../../../utils/tese-certifications'

/**
 * GET /vendor/certifications
 *
 * Sustainability certifications catalogue for vendor pickers (attach certs to
 * profile/products). Read-through proxy of tese-backend's shared catalogue.
 * Query: q (text search), category.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!isCertificationsCatalogueConfigured()) {
    return res.status(503).json({
      message: 'Certifications catalogue not configured (TESE_BACKEND_API_KEY)',
      certifications: [],
    })
  }

  try {
    const certifications = await fetchCertificationsCatalogue({
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      category:
        typeof req.query.category === 'string' ? req.query.category : undefined,
    })
    return res.json({ certifications, count: certifications.length })
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Certifications catalogue fetch failed'
    logger.error(`Vendor certifications proxy: ${message}`)
    return res.status(502).json({ message, certifications: [] })
  }
}
