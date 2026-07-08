import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getEncryptionKey (): Buffer {
  const secret = process.env.CONNECT_ENCRYPTION_KEY

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'CONNECT_ENCRYPTION_KEY must be set in production for connector credentials'
    )
  }

  const resolved =
    secret ||
    process.env.JWT_SECRET ||
    'connect-dev-key-change-in-production'

  return createHash('sha256').update(resolved).digest()
}

export function encryptCredential (plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64')
  ].join(':')
}

export function decryptCredential (payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted credential format')
  }

  const key = getEncryptionKey()
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const encrypted = Buffer.from(dataB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8')
}

export function parseCredentialJson<T> (encrypted: string): T {
  return JSON.parse(decryptCredential(encrypted)) as T
}

export function stringifyCredentialJson (data: unknown): string {
  return encryptCredential(JSON.stringify(data))
}
