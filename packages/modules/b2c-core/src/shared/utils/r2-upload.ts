import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
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

export const PRIVATE_READ_TTL_SECONDS = 5 * 60

const PRIVATE_PREFIX = 'marketplace/uploads/private/'

/**
 * Object key for a stored URL that points at OUR private bucket, or null
 * for anything else (external links, public assets). Matches on the
 * configured private host first, then on the private prefix as a path
 * segment so rows written under an older S3_FILE_URL still resolve.
 */
export const privateKeyFromStoredUrl = (url: unknown): string | null => {
  if (typeof url !== 'string' || !url.trim()) return null
  const clean = url.trim().split('#')[0].split('?')[0]
  const base = privateFileUrl()
  let key: string | null = null
  if (base && clean.startsWith(`${base}/`)) {
    key = clean.slice(base.length + 1)
  } else {
    const i = clean.indexOf(`/${PRIVATE_PREFIX}`)
    if (i >= 0) key = clean.slice(i + 1)
  }
  if (!key || !key.startsWith(PRIVATE_PREFIX)) return null
  const rest = key.slice(PRIVATE_PREFIX.length)
  if (!rest || rest.includes('/') || rest.includes('..')) return null
  return key
}

/**
 * Short-lived read link for an object on the PRIVATE bucket (G-12: private
 * documents are only ever served through signed, expiring links). Callers
 * must validate the key belongs to the record being viewed — this helper
 * signs whatever it is given.
 */
export const presignPrivateRead = async (
  key: string,
  ttlSeconds: number = PRIVATE_READ_TTL_SECONDS
): Promise<string> => {
  if (!isRemoteStorageConfigured()) {
    throw new Error('Private storage is not configured')
  }
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: privateBucket(), Key: key }),
    { expiresIn: ttlSeconds }
  )
}

/**
 * Remove an object from the PRIVATE bucket (retention sweeps). Idempotent
 * on the storage side — deleting a missing key succeeds — so callers can
 * safely retry. Throws when storage is not configured: a sweeper must
 * never mark a document purged that it could not actually delete.
 */
export const deletePrivateObject = async (key: string): Promise<void> => {
  if (!isRemoteStorageConfigured()) {
    throw new Error('Private storage is not configured')
  }
  await s3().send(new DeleteObjectCommand({ Bucket: privateBucket(), Key: key }))
}

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
