import { uploadFilesWorkflow } from '@medusajs/core-flows'
import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { HttpTypes } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'

import {
  UploadRejectedError,
  assertUploadAllowed
} from '../../../shared/utils/upload-policy'
import {
  isRemoteStorageConfigured,
  putApprovedUpload
} from '../../../shared/utils/r2-upload'

// When Medusa's local file provider is in use (S3_ACCESS_KEY_ID unset —
// see medusa-config.ts), uploaded files are returned with URLs hardcoded
// to http://localhost:9000/static/... which only works from the backend
// host itself. Rewrite that internal URL to the public host before we
// hand the URL back to the vendor panel, so downstream consumers can
// actually open the file. Prefer PUBLIC_BACKEND_URL, fall back to
// MEDUSA_BACKEND_URL (already used elsewhere in the codebase); no-op
// when neither is set (dev running locally with the panel).
const rewritePublicUrl = (url: string): string => {
  const publicBase = (
    process.env.PUBLIC_BACKEND_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    ''
  ).replace(/\/$/, '')
  if (!publicBase) return url
  // Only rewrite the localhost placeholder — leave S3/R2/CDN URLs alone.
  return url.replace(/^https?:\/\/localhost:9000/, publicBase)
}

export const POST = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminUploadFile>,
  res: MedusaResponse
) => {
  const input = (req as any).files

  if (!input?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'No files were uploaded'
    )
  }

  // Re-check with the bytes in hand. The multer fileFilter has already
  // vetted the name and declared type, but only here can we tell that a
  // file called logo.png is actually a PHP script. Store the values the
  // policy returns, not the client's: the name is stripped of characters
  // that would otherwise land in the object key and the public URL.
  let approved: { filename: string; mimeType: string }[]
  try {
    approved = input.map((f: any) =>
      assertUploadAllowed({
        filename: f.originalname,
        mimeType: f.mimetype,
        buffer: f.buffer
      })
    )
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
    }
    throw error
  }

  const purpose =
    typeof req.query?.purpose === 'string' ? req.query.purpose : null

  if (isRemoteStorageConfigured()) {
    const files = await Promise.all(
      input.map((f: any, index: number) =>
        putApprovedUpload(approved[index], f.buffer, purpose)
      )
    )
    res.json({ files })
    return
  }

  const { result: files } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: input.map((f: any, index: number) => ({
        filename: approved[index].filename,
        mimeType: approved[index].mimeType,
        content: f.buffer.toString('base64'),
        access: 'public'
      }))
    }
  })

  const rewritten = (files || []).map((f: any) => ({
    ...f,
    url: typeof f?.url === 'string' ? rewritePublicUrl(f.url) : f?.url
  }))

  res.json({ files: rewritten })
}
