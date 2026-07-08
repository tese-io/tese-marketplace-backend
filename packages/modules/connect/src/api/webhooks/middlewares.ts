import { MiddlewareRoute } from '@medusajs/framework'

/**
 * Webhook signatures (Shopify X-Shopify-Hmac-Sha256) are HMACs over the exact
 * request byte stream — the raw body must be preserved for verification.
 */
export const webhookMiddlewares: MiddlewareRoute[] = [
  {
    matcher: '/webhooks/connect/shopify/*',
    method: ['POST'],
    bodyParser: { preserveRawBody: true }
  }
]
