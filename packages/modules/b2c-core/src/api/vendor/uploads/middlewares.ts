import multer from 'multer'

import { MiddlewareRoute } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'

import {
  UploadRejectedError,
  assertUploadAllowed,
  maxUploadBytes,
  maxUploadFiles
} from '../../../shared/utils/upload-policy'

const upload = multer({
  storage: multer.memoryStorage(),
  // Files are buffered in memory, so an unbounded request is a way to
  // exhaust the backend's heap with a single call.
  limits: { fileSize: maxUploadBytes(), files: maxUploadFiles() },
  // Rejects on name and declared type before the body is buffered. The
  // route re-checks with the bytes in hand, which is the check that
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
 * they surface as unhandled errors and the vendor panel shows a generic
 * failure instead of telling the seller what was wrong with the file.
 */
const toMedusaError = (error: any): any => {
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

const receiveFilesWithErrorTranslation = (req: any, res: any, next: any) =>
  receiveFiles(req, res, (error: any) =>
    error ? next(toMedusaError(error)) : next()
  )

export const vendorUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/vendor/uploads',
    middlewares: [receiveFilesWithErrorTranslation]
  }
]
