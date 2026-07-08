import { JSONPath } from 'jsonpath-plus'

import type { NormalizedProduct } from '../../types'
import { slugifyHandle } from '../../types'
import { parseCredentialJson } from '../../services/credential-crypto'

export type CustomApiAuth =
  | { type: 'bearer'; token: string }
  | { type: 'api_key'; header: string; value: string }
  | { type: 'basic'; username: string; password: string }

export type CustomApiEndpoint = {
  path: string
  method?: string
  pagination?: {
    type: 'cursor' | 'offset'
    cursor_path?: string
    next_param?: string
    limit_param?: string
    page_size?: number
  }
  items_path?: string
}

export type CustomApiConfig = {
  base_url: string
  auth: CustomApiAuth
  endpoints: {
    list_products: CustomApiEndpoint
    list_categories?: CustomApiEndpoint
  }
  field_map: Record<string, string>
}

export type CustomApiCredentials = {
  config: CustomApiConfig
}

export async function customApiFetch<T> (
  config: CustomApiConfig,
  path: string,
  init?: RequestInit
): Promise<T> {
  const base = config.base_url.replace(/\/$/, '')
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> || {})
  }

  if (config.auth.type === 'bearer') {
    headers.Authorization = `Bearer ${config.auth.token}`
  } else if (config.auth.type === 'api_key') {
    headers[config.auth.header] = config.auth.value
  } else if (config.auth.type === 'basic') {
    const encoded = Buffer.from(
      `${config.auth.username}:${config.auth.password}`
    ).toString('base64')
    headers.Authorization = `Basic ${encoded}`
  }

  const response = await fetch(url, {
    ...init,
    method: init?.method || 'GET',
    headers
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Custom API error (${response.status}): ${text}`)
  }

  return response.json() as Promise<T>
}

export async function fetchCustomApiProducts (
  credentials: CustomApiCredentials
): Promise<NormalizedProduct[]> {
  const config = credentials.config
  const endpoint = config.endpoints.list_products
  const products: NormalizedProduct[] = []
  let nextUrl: string | null = endpoint.path
  let page = 1

  while (nextUrl) {
    const path =
      endpoint.pagination?.type === 'offset' && endpoint.pagination.limit_param
        ? appendQuery(nextUrl, {
            [endpoint.pagination.limit_param]:
              String(endpoint.pagination.page_size || 50),
            [endpoint.pagination.next_param || 'page']: String(page)
          })
        : nextUrl

    const payload = await customApiFetch<unknown>(config, path, {
      method: endpoint.method || 'GET'
    })

    const items = extractJsonPathItems(payload as object, endpoint.items_path)

    for (const item of items) {
      products.push(mapCustomApiProduct(item, config.field_map))
    }

    if (endpoint.pagination?.type === 'cursor' && endpoint.pagination.cursor_path) {
      const cursor = JSONPath({
        path: endpoint.pagination.cursor_path,
        json: payload as object
      })?.[0]
      nextUrl = cursor ? appendQuery(endpoint.path, { cursor: String(cursor) }) : null
    } else if (
      endpoint.pagination?.type === 'offset' &&
      items.length >= (endpoint.pagination.page_size || 50)
    ) {
      page += 1
      nextUrl = endpoint.path
    } else {
      nextUrl = null
    }
  }

  return products
}

function extractJsonPathItems (
  payload: object,
  itemsPath?: string
): unknown[] {
  if (!itemsPath) {
    return Array.isArray(payload) ? payload : [payload]
  }

  const result = JSONPath({
    path: itemsPath,
    json: payload,
    wrap: true
  })

  return Array.isArray(result) ? result : [result]
}

export async function fetchCustomApiCategories (
  credentials: CustomApiCredentials
): Promise<Array<{ id: string; name: string; path?: string }>> {
  const config = credentials.config
  const endpoint = config.endpoints.list_categories

  if (!endpoint) return []

  const payload = await customApiFetch<unknown>(config, endpoint.path, {
    method: endpoint.method || 'GET'
  })

  const items = extractJsonPathItems(payload as object, endpoint.items_path)

  return items.map((item, index) => {
    const id =
      readMappedValue(item, config.field_map.external_category_id || '$.id') ||
      String(index)
    const name =
      readMappedValue(item, config.field_map.external_category_name || '$.name') ||
      `Category ${id}`

    return { id: String(id), name: String(name), path: String(name) }
  })
}

function mapCustomApiProduct (
  item: unknown,
  fieldMap: Record<string, string>
): NormalizedProduct {
  const title =
    readMappedValue(item, fieldMap.title || '$.name') ||
    readMappedValue(item, fieldMap.name || '$.title') ||
    'Untitled Product'
  const externalId =
    readMappedValue(item, fieldMap.external_id || '$.id') ||
    slugifyHandle(String(title))
  const description = readMappedValue(item, fieldMap.description || '$.description')
  const sku = readMappedValue(item, fieldMap.sku || '$.sku')
  const priceRaw = readMappedValue(item, fieldMap.price || '$.price')
  const price = priceRaw != null ? Number(priceRaw) : 0
  const categoryId = readMappedValue(item, fieldMap.category_id || '$.category_id')

  return {
    external_id: String(externalId),
    title: String(title),
    description: description != null ? String(description) : undefined,
    handle: slugifyHandle(String(title)),
    category_ids: categoryId ? [String(categoryId)] : undefined,
    variants: [{
      title: 'Default',
      sku: sku != null ? String(sku) : undefined,
      prices: [{
        amount: Math.round((Number.isFinite(price) ? price : 0) * 100),
        currency_code: 'usd'
      }]
    }],
    metadata: {
      custom_api_source: true
    }
  }
}

function readMappedValue (item: unknown, path: string): unknown {
  const result = JSONPath({ path, json: item as object, wrap: false })
  return Array.isArray(result) ? result[0] : result
}

function appendQuery (
  path: string,
  params: Record<string, string>
): string {
  const url = new URL(path, 'http://local')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return `${url.pathname}${url.search}`
}

export function parseCustomApiCredentialsFromEncrypted (
  encrypted: string
): CustomApiCredentials {
  return parseCredentialJson<CustomApiCredentials>(encrypted)
}
