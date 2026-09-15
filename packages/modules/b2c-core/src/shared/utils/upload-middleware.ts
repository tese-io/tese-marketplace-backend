import multer from 'multer'

import { MiddlewareRoute } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'

import {
  UploadRejectedError,
  assertUploadAllowed,
  maxUploadBytes,
  maxUploadFiles
} from './upload-policy'

const upload = multer({
  storage: multer.memoryStorage(),
  // Files are buffered in memory, so an unbounded request is a way to
  // exhaust the backend's heap with a single call.
  limits: { fileSize: maxUploadBytes(), files: maxUploadFiles() },
  // Rejects on name and declared type before the body is buffered. The
  // handler re-checks with the bytes in hand, which is the check that
  // actually catches a renamed payload; this one just avoids paying for
  // the transfer first.
  fileFilter: (_req, file, cb) => {
    try {
      assertUploadAllowed({
        filename: file.originalname,
        mimeType: file.mimetype
      })
      cb(null, true)
    } catch (error) {
      cb(error as Error)
    }
  }
})

const receiveFiles = upload.array('files')

const megabytes = (bytes: number) =>
  Math.round((bytes / (1024 * 1024)) * 10) / 10

/**
 * Turn multer's limit errors and our own rejections into 400s. Without this
 * they surface as unhandled errors and the panel shows a generic failure
 * instead of telling the caller what was wrong with the file.
 */
export const toUploadMedusaError = (error: any): any => {
  if (error instanceof UploadRejectedError) {
    return new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
  }

  if (error?.code === 'LIMIT_FILE_SIZE') {
    return new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Files must be smaller than ${megabytes(maxUploadBytes())} MB.`
    )
  }

  if (error?.code === 'LIMIT_FILE_COUNT') {
    return new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `You can upload at most ${maxUploadFiles()} files at a time.`
    )
  }

  return error
}

export const receiveFilesWithErrorTranslation = (
  req: any,
  res: any,
  next: any
) =>
  receiveFiles(req, res, (error: any) =>
    error ? next(toUploadMedusaError(error)) : next()
  )

export const uploadRouteMiddlewares = (
  matcher: string
): MiddlewareRoute[] => [
  {
    method: ['POST'],
    matcher,
    middlewares: [receiveFilesWithErrorTranslation]
  }
]

/**
 * Core Medusa already runs multer on `/admin/uploads`. Re-parsing would
 * wipe `req.files`. This only validates what is already on the request.
 */
export const validateReceivedUploads = (req: any, _res: any, next: any) => {
  const files = (req.files || []) as Array<{
    originalname: string
    mimetype: string
    buffer: Buffer
  }>

  try {
    if (files.length > maxUploadFiles()) {
      throw Object.assign(new Error('too many files'), {
        code: 'LIMIT_FILE_COUNT'
      })
    }

    for (const file of files) {
      if (file.buffer?.length > maxUploadBytes()) {
        throw Object.assign(new Error('file too large'), {
          code: 'LIMIT_FILE_SIZE'
        })
      }
      assertUploadAllowed({
        filename: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer
      })
    }

    next()
  } catch (error) {
    next(toUploadMedusaError(error))
  }
}
