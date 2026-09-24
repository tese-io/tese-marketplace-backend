import { toOcrPrefill, type OcrPrefill } from './business-verification'

/**
 * Client for tese-backend's business-document OCR endpoint (KYB pre-fill).
 * The platform's OCR service reads the legal name / registration number /
 * country off an uploaded registration document; the vendor confirms or
 * corrects. Pre-fill only — never a verification — so this client is
 * strictly best-effort and NEVER throws.
 *
 * Env: TESE_BACKEND_URL, TESE_BACKEND_API_KEY (needs the `use:ocr`
 * permission on the service key).
 */

const baseUrl = () =>
  (process.env.TESE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')
const apiKey = () => process.env.TESE_BACKEND_API_KEY || ''
// OCR is slow (vision model + PDF rasterisation) — generous by design.
const timeoutMs = () => Number(process.env.BUSINESS_OCR_TIMEOUT_MS || 90_000)

export const isBusinessOcrConfigured = () => Boolean(apiKey())

export async function prefillBusinessDocument(params: {
  imageUrl: string
  mimeType?: string | null
  sellerId: string
}): Promise<OcrPrefill | null> {
  if (!isBusinessOcrConfigured()) return null
  try {
    const response = await fetch(
      `${baseUrl()}/api/v3/marketplace/ocr/business-document`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey()
        },
        body: JSON.stringify({
          image_url: params.imageUrl,
          mime_type: params.mimeType || undefined,
          seller_id: params.sellerId
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs())
      }
    )
    if (!response.ok) {
      console.warn(
        `[business-ocr] prefill unavailable (${response.status}) for seller ${params.sellerId}`
      )
      return null
    }
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>
    return toOcrPrefill(json.prefill)
  } catch (error) {
    console.warn(
      `[business-ocr] prefill failed for seller ${params.sellerId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    return null
  }
}
