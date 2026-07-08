import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { fetchSellerByAuthActorId } from '../../../../../shared/infra/http/utils'

const TESE_BACKEND_URL = (
  process.env.TESE_BACKEND_URL || 'http://localhost:8000'
).replace(/\/$/, '')

const STOREFRONT_BFF_KEY = process.env.STOREFRONT_BFF_API_KEY || ''

/**
 * Submit (or revise) the seller's quote on an RFQ enquiry — the chat
 * "Send quotation" flow. Proxies tese-backend
 * POST /api/v3/storefront/vendor/enquiries/:id/quote (source of truth is
 * the Mongo storefront_enquiries collection, like the enquiries list).
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<{
    quotedAmount?: number
    quotedCurrency?: string
    quoteNotes?: string
  }>,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  if (!STOREFRONT_BFF_KEY) {
    return res.status(503).json({ message: 'Storefront BFF key not configured' })
  }

  try {
    const url = `${TESE_BACKEND_URL}/api/v3/storefront/vendor/enquiries/${encodeURIComponent(req.params.id)}/quote`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Storefront-Bff-Key': STOREFRONT_BFF_KEY,
        'X-Seller-Id': seller.id,
      },
      body: JSON.stringify(req.body || {}),
      cache: 'no-store',
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      return res.status(response.status).json(json)
    }

    return res.json(json?.data || json)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Vendor quote proxy failed'
    logger.error(`Vendor quote proxy: ${message}`)
    return res.status(502).json({ message })
  }
}
