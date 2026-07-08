import type { NormalizedProduct } from '../../types'
import { slugifyHandle } from '../../types'
import { parseCredentialJson } from '../../services/credential-crypto'

export type MagentoCredentials = {
  store_host: string
  api_key: string
  api_version?: string
}

export type MagentoExternalCategory = {
  id: string
  name: string
  path?: string
  parent_id?: string | null
}

export async function magentoFetch<T> (
  credentials: MagentoCredentials,
  path: string,
  init?: RequestInit
): Promise<T> {
  const version = credentials.api_version || 'V1'
  const host = credentials.store_host.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const url = `https://${host}/rest/${version}${path}`

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.api_key}`,
      ...(init?.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Magento API error (${response.status}): ${text}`)
  }

  return response.json() as Promise<T>
}

export async function fetchMagentoProducts (
  credentials: MagentoCredentials,
  pageSize = 50,
  currentPage = 1
): Promise<{ items: NormalizedProduct[]; total_count: number }> {
  const data = await magentoFetch<{
    items: any[]
    total_count: number
  }>(
    credentials,
    `/products?searchCriteria[pageSize]=${pageSize}&searchCriteria[currentPage]=${currentPage}`
  )

  return {
    items: (data.items || []).map((item) =>
      normalizeMagentoProduct(item, credentials.store_host)
    ),
    total_count: data.total_count || 0
  }
}

export async function fetchAllMagentoProducts (
  credentials: MagentoCredentials,
  pageSize = 100
): Promise<NormalizedProduct[]> {
  const products: NormalizedProduct[] = []
  let currentPage = 1
  let totalCount = Infinity

  while (products.length < totalCount) {
    const page = await fetchMagentoProducts(credentials, pageSize, currentPage)
    totalCount = page.total_count

    if (!page.items.length) {
      break
    }

    products.push(...page.items)
    currentPage += 1
  }

  return products
}

export async function fetchMagentoCategories (
  credentials: MagentoCredentials
): Promise<MagentoExternalCategory[]> {
  const data = await magentoFetch<{ items: any[] }>(
    credentials,
    '/categories/list?searchCriteria[pageSize]=250'
  )

  return (data.items || []).map((category) => ({
    id: String(category.id),
    name: category.name,
    path: category.path || category.name,
    parent_id: category.parent_id != null ? String(category.parent_id) : null
  }))
}

export async function fetchMagentoInventoryForSku (
  credentials: MagentoCredentials,
  sku: string
): Promise<number | null> {
  try {
    const data = await magentoFetch<{ items: any[] }>(
      credentials,
      `/inventory/source-items?searchCriteria[filter_groups][0][filters][0][field]=sku&searchCriteria[filter_groups][0][filters][0][value]=${encodeURIComponent(sku)}`
    )

    const quantity = (data.items || []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    )

    return quantity
  } catch {
    return null
  }
}

export function normalizeMagentoProduct (
  product: any,
  storeHost?: string
): NormalizedProduct {
  const customAttrs = product.custom_attributes || []
  const getAttr = (code: string) =>
    customAttrs.find((attr: any) => attr.attribute_code === code)?.value

  const description = getAttr('description') || product.description
  const imagePath = getAttr('image')
  const categoryIds = (product.extension_attributes?.category_links || [])
    .map((link: any) => String(link.category_id))

  const price = product.price || getAttr('price') || 0
  const sku = product.sku || String(product.id)

  return {
    external_id: String(product.id),
    title: product.name,
    description: typeof description === 'string' ? description : undefined,
    handle: slugifyHandle(product.name),
    status: product.status === 1 ? 'published' : 'draft',
    thumbnail: imagePath && storeHost
      ? `${buildMagentoStoreUrl(storeHost)}/media/catalog/product${imagePath}`
      : undefined,
    category_ids: categoryIds.length ? [categoryIds[0]] : undefined,
    variants: [{
      title: 'Default',
      sku,
      prices: [{
        amount: Math.round(Number(price) * 100),
        currency_code: 'usd'
      }]
    }],
    metadata: {
      magento_product_id: String(product.id),
      magento_sku: sku,
      magento_type_id: product.type_id
    }
  }
}

export function parseMagentoCredentialsFromEncrypted (
  encrypted: string
): MagentoCredentials {
  return parseCredentialJson<MagentoCredentials>(encrypted)
}

export function buildMagentoStoreUrl (storeHost: string): string {
  const host = storeHost.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://${host}`
}
