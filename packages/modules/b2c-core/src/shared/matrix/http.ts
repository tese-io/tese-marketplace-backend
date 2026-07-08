export class MatrixApiError extends Error {
  status: number
  errcode?: string
  body?: unknown

  constructor(
    message: string,
    status: number,
    errcode?: string,
    body?: unknown
  ) {
    super(message)
    this.name = 'MatrixApiError'
    this.status = status
    this.errcode = errcode
    this.body = body
  }
}

type MatrixFetchOptions = {
  token: string
  body?: unknown
  timeoutMs?: number
  maxRetries?: number
}

const RETRYABLE_STATUSES = [429, 500, 502, 503, 504]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Minimal fetch wrapper for the Synapse client + admin APIs with timeout and
 * exponential-backoff retry on 429/5xx/network errors (port of
 * tese-backend's matrixHttpClient retry behaviour, without axios).
 */
export const matrixFetch = async <T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  baseUrl: string,
  path: string,
  { token, body, timeoutMs = 15000, maxRetries = 2 }: MatrixFetchOptions
): Promise<T> => {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(500 * 2 ** (attempt - 1))
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        const error = new MatrixApiError(
          json?.error || `Matrix API ${response.status} on ${method} ${path}`,
          response.status,
          json?.errcode,
          json
        )
        if (RETRYABLE_STATUSES.includes(response.status) && attempt < maxRetries) {
          lastError = error
          continue
        }
        throw error
      }

      return json as T
    } catch (error) {
      if (error instanceof MatrixApiError) {
        throw error
      }
      // AbortError / network failure — retry if attempts remain
      lastError = error
      if (attempt >= maxRetries) {
        const message =
          error instanceof Error ? error.message : 'Matrix request failed'
        throw new MatrixApiError(message, 0)
      }
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new MatrixApiError('Matrix request failed', 0)
}
