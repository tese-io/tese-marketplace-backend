import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'

const TESE_BACKEND_URL = (
  process.env.TESE_BACKEND_URL || 'http://localhost:8000'
).replace(/\/$/, '')

const STOREFRONT_BFF_KEY = process.env.STOREFRONT_BFF_API_KEY || ''

/**
 * Proxy seller RFQ inbox from tese-backend (Mongo StorefrontEnquiry).
 * Source of truth remains tese-backend — Medusa only exposes vendor UX.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  if (!STOREFRONT_BFF_KEY) {
    return res.status(503).json({
      message: 'Storefront BFF key not configured',
      items: [],
    })
  }

  try {
    const page = String(req.query.page || '1')
    const size = String(req.query.size || '20')
    const url = `${TESE_BACKEND_URL}/api/v3/storefront/vendor/enquiries?sellerId=${encodeURIComponent(seller.id)}&page=${page}&size=${size}`

    const response = await fetch(url, {
      headers: {
        'X-Storefront-Bff-Key': STOREFRONT_BFF_KEY,
        'X-Seller-Id': seller.id,
      },
      cache: 'no-store',
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      return res.status(response.status).json(json)
    }

    return res.json(json?.data || { items: [], pagination: { total: 0 } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Vendor enquiries proxy failed'
    logger.error(`Vendor enquiries proxy: ${message}`)
    return res.status(502).json({ message, items: [] })
  }
}
