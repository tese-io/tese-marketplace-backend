import { uploadFilesWorkflow } from '@medusajs/core-flows'
import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { HttpTypes } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'

import { toUploadMedusaError } from './upload-middleware'
import {
  isRemoteStorageConfigured,
  putApprovedUpload
} from './r2-upload'
import {
  assertUploadAllowed,
  maxUploadBytes
} from './upload-policy'

// When Medusa's local file provider is in use (S3_ACCESS_KEY_ID unset —
// see medusa-config.ts), uploaded files are returned with URLs hardcoded
// to http://localhost:9000/static/... which only works from the backend
// host itself. Rewrite that internal URL to the public host before we
// hand the URL back to the panel. Prefer PUBLIC_BACKEND_URL, fall back to
// MEDUSA_BACKEND_URL; no-op when neither is set.
const rewritePublicUrl = (url: string): string => {
  const publicBase = (
    process.env.PUBLIC_BACKEND_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    ''
  ).replace(/\/$/, '')
  if (!publicBase) return url
  return url.replace(/^https?:\/\/localhost:9000/, publicBase)
}

const purposeFromQuery = (req: AuthenticatedMedusaRequest): string | null =>
  typeof req.query?.purpose === 'string' ? req.query.purpose : null

/**
 * Shared POST body for `/vendor/uploads` and `/admin/uploads`.
 *
 * Images go to tese-staging-public / marketplace/uploads/public/.
 * Documents, CSVs and unknown types go to tese-staging /
 * marketplace/uploads/private/. An explicit `?purpose=` wins.
 */
export const handleMarketplaceUploads = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminUploadFile>,
  res: MedusaResponse
) => {
  const input = (req as any).files as
    | Array<{ originalname: string; mimetype: string; buffer: Buffer }>
    | undefined

  if (!input?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'No files were uploaded'
    )
  }

  const ceiling = maxUploadBytes()
  for (const file of input) {
    if (file.buffer?.length > ceiling) {
      throw toUploadMedusaError({ code: 'LIMIT_FILE_SIZE' })
    }
  }

  let approved
  try {
    approved = input.map((file) =>
      assertUploadAllowed({
        filename: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer
      })
    )
  } catch (error) {
    throw toUploadMedusaError(error)
  }

  const purpose = purposeFromQuery(req)

  if (isRemoteStorageConfigured()) {
    const files = await Promise.all(
      input.map((file, index) =>
        putApprovedUpload(approved[index], file.buffer, purpose)
      )
    )
    res.status(200).json({ files })
    return
  }

  const { result: files } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: input.map((_file, index) => ({
        filename: approved[index].filename,
        mimeType: approved[index].mimeType,
        content: input[index].buffer.toString('base64'),
        access: 'public'
      }))
    }
  })

  const rewritten = (files || []).map((file: any) => ({
    ...file,
    url: typeof file?.url === 'string' ? rewritePublicUrl(file.url) : file?.url
  }))

  res.status(200).json({ files: rewritten })
}
