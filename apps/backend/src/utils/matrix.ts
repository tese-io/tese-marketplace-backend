/**
 * Matrix (Synapse) helpers for marketplace chat.
 * Mirrors tese-backend patterns: ensureMatrixUser, loginAsUser, createRoom.
 * Requires: MATRIX_BASE_URL, MATRIX_SERVER_NAME, MATRIX_ADMIN_TOKEN
 */

import crypto from 'crypto'

const MATRIX_BASE_URL = (process.env.MATRIX_BASE_URL || '').replace(/\/$/, '')
const MATRIX_SERVER_NAME = process.env.MATRIX_SERVER_NAME || (MATRIX_BASE_URL ? new URL(MATRIX_BASE_URL).hostname : '')
const MATRIX_ADMIN_TOKEN = process.env.MATRIX_ADMIN_TOKEN || process.env.SYNAPSE_ADMIN_TOKEN

function customerIdToMatrixId (customerId: string): string {
  return `@m_customer_${String(customerId)}:${MATRIX_SERVER_NAME}`
}

function sellerIdToMatrixId (sellerId: string): string {
  return `@m_seller_${String(sellerId)}:${MATRIX_SERVER_NAME}`
}

async function matrixRequest (
  method: string,
  path: string,
  options: { data?: Record<string, unknown>, headers?: Record<string, string> } = {}
): Promise<{ data: Record<string, unknown> }> {
  const url = `${MATRIX_BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  if (MATRIX_ADMIN_TOKEN && !headers.Authorization) {
    headers.Authorization = `Bearer ${MATRIX_ADMIN_TOKEN}`
  }
  const res = await fetch(url, {
    method,
    headers,
    body: options.data ? JSON.stringify(options.data) : undefined
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const err = new Error(data.error || res.statusText) as Error & { response?: { status: number, data?: unknown } }
    err.response = { status: res.status, data }
    throw err
  }
  return { data }
}

export async function ensureMatrixUser (matrixUserId: string, displayName: string): Promise<void> {
  if (!MATRIX_ADMIN_TOKEN || !MATRIX_BASE_URL) {
    throw new Error('Matrix admin not configured (MATRIX_BASE_URL, MATRIX_ADMIN_TOKEN)')
  }
  try {
    await matrixRequest('GET', `/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`)
    return
  } catch (e: unknown) {
    const err = e as { response?: { status: number } }
    if (err.response?.status !== 404) throw e
  }
  const password = crypto.randomBytes(24).toString('base64')
  await matrixRequest('PUT', `/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`, {
    data: {
      password,
      displayname: displayName,
      admin: false,
      deactivated: false
    }
  })
}

export async function loginAsUser (matrixUserId: string): Promise<{ accessToken: string, userId: string }> {
  if (!MATRIX_ADMIN_TOKEN || !MATRIX_BASE_URL) {
    throw new Error('Matrix admin not configured')
  }
  await ensureMatrixUser(matrixUserId, `User ${matrixUserId.split('@')[1]?.split(':')[0] || matrixUserId}`)
  try {
    const res = await matrixRequest('POST', `/_synapse/admin/v1/users/${encodeURIComponent(matrixUserId)}/login`, { data: {} })
    const token = (res.data as { access_token?: string }).access_token
    const uid = (res.data as { user_id?: string }).user_id || matrixUserId
    if (!token) throw new Error('No access_token in response')
    return { accessToken: token, userId: uid }
  } catch {
    const res = await matrixRequest('POST', `/_synapse/admin/v1/users/${encodeURIComponent(matrixUserId)}/access_tokens`, {
      data: {
        device_id: `mp_${Date.now()}`,
        valid_until_ms: Date.now() + 24 * 60 * 60 * 1000
      }
    })
    const token = (res.data as { access_token?: string }).access_token
    if (!token) throw new Error('No access_token in response')
    return { accessToken: token, userId: matrixUserId }
  }
}

interface RoomEntry {
  room_id: string
  customer_id: string
  seller_id: string
  name: string
  product_id?: string
  order_id?: string
}

const roomCache = new Map<string, RoomEntry>()

function roomKey (productId: string | undefined, sellerId: string, orderId: string | undefined): string {
  if (orderId) return `order_${orderId}`
  return `product_${productId || 'none'}_${sellerId}`
}

export async function getOrCreateMarketplaceRoom (params: {
  customerId: string
  sellerId: string
  productId?: string
  orderId?: string
  roomName?: string
}): Promise<{ room_id: string }> {
  const { customerId, sellerId, productId, orderId, roomName } = params
  const key = roomKey(productId, sellerId, orderId)
  const existing = roomCache.get(key)
  if (existing) {
    return { room_id: existing.room_id }
  }

  const customerMx = customerIdToMatrixId(customerId)
  const sellerMx = sellerIdToMatrixId(sellerId)
  await ensureMatrixUser(sellerMx, `Seller ${sellerId}`)
  const { accessToken } = await loginAsUser(customerMx)

  const name = roomName || (orderId ? `Order ${orderId}` : `Product inquiry`)
  const body = {
    name,
    invite: [sellerMx],
    preset: 'trusted_private_chat' as const,
    visibility: 'private' as const
  }

  const res = await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/createRoom`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText)
  }
  const roomId = (data as { room_id?: string }).room_id
  if (!roomId) throw new Error('No room_id in createRoom response')

  roomCache.set(key, {
    room_id: roomId,
    customer_id: customerId,
    seller_id: sellerId,
    name,
    product_id: productId,
    order_id: orderId
  })
  return { room_id: roomId }
}

export function getRoomsForCustomer (customerId: string): Array<{ room_id: string, name: string, seller_id: string }> {
  const out: Array<{ room_id: string, name: string, seller_id: string }> = []
  for (const entry of roomCache.values()) {
    if (entry.customer_id === customerId) {
      out.push({ room_id: entry.room_id, name: entry.name, seller_id: entry.seller_id })
    }
  }
  return out
}

export { customerIdToMatrixId, sellerIdToMatrixId }
