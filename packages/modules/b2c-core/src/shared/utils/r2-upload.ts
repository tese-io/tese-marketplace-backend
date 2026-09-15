import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

import {
  prefixForVisibility,
  visibilityForUpload,
  type ApprovedUpload,
  type UploadVisibility
} from './upload-policy'

export interface StoredUpload {
  id: string
  url: string
  key: string
  visibility: UploadVisibility
}

const privateBucket = () => process.env.S3_BUCKET || ''
const publicBucket = () =>
  process.env.S3_PUBLIC_BUCKET || process.env.S3_BUCKET || ''
const privateFileUrl = () => (process.env.S3_FILE_URL || '').replace(/\/$/, '')
const publicFileUrl = () =>
  (process.env.S3_PUBLIC_FILE_URL || process.env.S3_FILE_URL || '').replace(
    /\/$/,
    ''
  )

let client: S3Client | null = null

const s3 = (): S3Client => {
  if (client) return client
  client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
    },
    forcePathStyle: true
  })
  return client
}

export const isRemoteStorageConfigured = (): boolean =>
  Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_BUCKET)

export const resolveUploadTarget = (
  approved: ApprovedUpload,
  purpose?: string | null
): {
  visibility: UploadVisibility
  bucket: string
  fileUrl: string
  prefix: string
} => {
  const visibility = visibilityForUpload({
    extension: approved.extension,
    purpose
  })
  const usePublic = visibility === 'public' && Boolean(process.env.S3_PUBLIC_BUCKET)
  return {
    visibility,
    bucket: usePublic ? publicBucket() : privateBucket(),
    fileUrl: usePublic ? publicFileUrl() : privateFileUrl(),
    prefix: prefixForVisibility(visibility)
  }
}

/**
 * Put one validated file into the public or private R2 bucket.
 * Keys look like `marketplace/uploads/{public|private}/{stem}-{uuid}{ext}`.
 */
export const putApprovedUpload = async (
  approved: ApprovedUpload,
  buffer: Buffer,
  purpose?: string | null
): Promise<StoredUpload> => {
  const target = resolveUploadTarget(approved, purpose)
  const unique = `${approved.filename.replace(/(\.[^.]+)$/, '')}-${randomUUID().replace(/-/g, '')}.${approved.extension}`
  const key = `${target.prefix}${unique}`

  await s3().send(
    new PutObjectCommand({
      Bucket: target.bucket,
      Key: key,
      Body: buffer,
      ContentType: approved.mimeType
    })
  )

  const base = target.fileUrl || `https://${target.bucket}`
  return {
    id: key,
    url: `${base}/${key}`,
    key,
    visibility: target.visibility
  }
}
