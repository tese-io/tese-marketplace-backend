import { createHmac, timingSafeEqual } from 'crypto'

import type { NormalizedProduct } from '../../types'
import { slugifyHandle } from '../../types'
import {
  decryptCredential,
  parseCredentialJson
} from '../../services/credential-crypto'

export type ShopifyCredentials = {
  shop_domain: string
  access_token: string
  scope?: string
}

export type ShopifyExternalCategory = {
  id: string
  name: string
  path?: string
}

const SHOPIFY_API_VERSION = '2025-01'

export function getShopifyOAuthUrl (input: {
  shop: string
  clientId: string
  redirectUri: string
  state: string
  scopes?: string[]
}): string {
  const shop = normalizeShopDomain(input.shop)
  const scopes = (input.scopes || defaultShopifyScopes()).join(',')

  const params = new URLSearchParams({
    client_id: input.clientId,
    scope: scopes,
    redirect_uri: input.redirectUri,
    state: input.state
  })

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

export async function exchangeShopifyToken (input: {
  shop: string
  clientId: string
  clientSecret: string
  code: string
}): Promise<ShopifyCredentials> {
  const shop = normalizeShopDomain(input.shop)
  const response = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: input.code
      })
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify OAuth failed: ${text}`)
  }

  const data = await response.json()

  return {
    shop_domain: shop,
    access_token: data.access_token,
    scope: data.scope
  }
}

export function verifyShopifyWebhook (
  rawBody: string | Buffer,
  hmacHeader: string | undefined,
  secret: string
): boolean {
  if (!hmacHeader) return false

  const digest = createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64')

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader))
  } catch {
    return false
  }
}

export async function shopifyAdminFetch<T> (
  credentials: ShopifyCredentials,
  path: string,
  init?: RequestInit
): Promise<T> {
  const { data } = await shopifyAdminFetchWithMeta<T>(credentials, path, init)
  return data
}

async function shopifyAdminFetchWithMeta<T> (
  credentials: ShopifyCredentials,
  path: string,
  init?: RequestInit
): Promise<{ data: T; link: string | null }> {
  const url = path.startsWith('http')
    ? path
    : `https://${credentials.shop_domain}/admin/api/${SHOPIFY_API_VERSION}${path}`

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': credentials.access_token,
      ...(init?.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify API error (${response.status}): ${text}`)
  }

  return {
    data: (await response.json()) as T,
    link: response.headers.get('link')
  }
}

function parseShopifyNextPath (linkHeader: string | null): string | null {
  if (!linkHeader) return null

  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/)
    if (!match) continue

    const url = new URL(match[1])
    const prefix = `/admin/api/${SHOPIFY_API_VERSION}`
    return `${url.pathname.replace(prefix, '')}${url.search}`
  }

  return null
}

export async function fetchShopifyProducts (
  credentials: ShopifyCredentials,
  limit = 50
): Promise<NormalizedProduct[]> {
  const data = await shopifyAdminFetch<{ products: any[] }>(
    credentials,
    `/products.json?limit=${limit}`
  )

  return (data.products || []).map(normalizeShopifyProduct)
}

export async function fetchAllShopifyProducts (
  credentials: ShopifyCredentials,
  pageSize = 250
): Promise<NormalizedProduct[]> {
  const products: NormalizedProduct[] = []
  let path: string | null = `/products.json?limit=${Math.min(pageSize, 250)}`

  while (path) {
    const { data, link } = await shopifyAdminFetchWithMeta<{ products: any[] }>(
      credentials,
      path
    )
    products.push(...(data.products || []).map(normalizeShopifyProduct))
    path = parseShopifyNextPath(link)
  }

  return products
}

export async function registerShopifyWebhooks (
  credentials: ShopifyCredentials,
  webhookBaseUrl: string,
  installationId: string
) {
  const topics = [
    'products/create',
    'products/update',
    'products/delete',
    'inventory_levels/update'
  ]

  for (const topic of topics) {
    await shopifyAdminFetch(credentials, '/webhooks.json', {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          topic,
          address: `${webhookBaseUrl}/webhooks/connect/shopify/${installationId}`,
          format: 'json'
        }
      })
    }).catch(() => {
      // webhook may already exist
    })
  }
}

export async function fetchShopifyCollections (
  credentials: ShopifyCredentials
): Promise<ShopifyExternalCategory[]> {
  const custom = await shopifyAdminFetch<{ custom_collections: any[] }>(
    credentials,
    '/custom_collections.json?limit=250'
  )

  const smart = await shopifyAdminFetch<{ smart_collections: any[] }>(
    credentials,
    '/smart_collections.json?limit=250'
  )

  const collections = [
    ...(custom.custom_collections || []),
    ...(smart.smart_collections || [])
  ]

  return collections.map((collection) => ({
    id: String(collection.id),
    name: collection.title,
    path: collection.title
  }))
}

export function normalizeShopifyProduct (product: any): NormalizedProduct {
  const variants = (product.variants || []).map((variant: any) => ({
    title: variant.title || 'Default',
    sku: variant.sku || undefined,
    prices: variant.price
      ? [{ amount: Math.round(parseFloat(variant.price) * 100), currency_code: 'usd' }]
      : [],
    inventory_quantity: variant.inventory_quantity,
    options: {
      ...(variant.option1 ? { Option1: variant.option1 } : {}),
      ...(variant.option2 ? { Option2: variant.option2 } : {}),
      ...(variant.option3 ? { Option3: variant.option3 } : {})
    }
  }))

  const options = (product.options || [])
    .filter((opt: any) => opt.name !== 'Title' || (opt.values || []).length > 1)
    .map((opt: any) => ({
      title: opt.name,
      values: opt.values || []
    }))

  return {
    external_id: String(product.id),
    title: product.title,
    description: product.body_html || undefined,
    handle: product.handle || slugifyHandle(product.title),
    status: product.status === 'active' ? 'published' : 'draft',
    thumbnail: product.image?.src || product.images?.[0]?.src,
    images: (product.images || []).map((img: any) => ({ url: img.src })),
    tags: (product.tags || '')
      .split(',')
      .map((tag: string) => tag.trim())
      .filter(Boolean)
      .map((value: string) => ({ value })),
    options: options.length ? options : undefined,
    variants: variants.length
      ? variants
      : [{
          title: 'Default',
          prices: [{ amount: 0, currency_code: 'usd' }]
        }],
    metadata: {
      shopify_product_id: String(product.id),
      shopify_vendor: product.vendor,
      shopify_product_type: product.product_type
    }
  }
}

export function parseShopifyCredentialsFromEncrypted (
  encrypted: string
): ShopifyCredentials {
  return parseCredentialJson<ShopifyCredentials>(encrypted)
}

export function decryptShopifyCredential (encrypted: string): ShopifyCredentials {
  return JSON.parse(decryptCredential(encrypted)) as ShopifyCredentials
}

function normalizeShopDomain (shop: string): string {
  const trimmed = shop.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  return trimmed.includes('.myshopify.com')
    ? trimmed
    : `${trimmed}.myshopify.com`
}

function defaultShopifyScopes (): string[] {
  return [
    'read_products',
    'read_inventory',
    'read_orders',
    'read_product_listings'
  ]
}
