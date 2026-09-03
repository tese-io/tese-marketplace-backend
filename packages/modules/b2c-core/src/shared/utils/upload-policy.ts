/**
 * Upload validation for vendor-supplied files.
 *
 * `/vendor/uploads` used to pass the client's `originalname` and `mimetype`
 * straight through to the file provider, so an approved seller could name a
 * file anything and have it stored and served under that name. The sibling
 * Tese backend had the same gap on its own upload routes and four
 * `php-reverse-shell` payloads were found sitting in the shared R2 bucket
 * because of it.
 *
 * The allowlist below is not invented: it is exactly what the vendor panel's
 * own file pickers offer, so nothing a seller can legitimately select is
 * refused here.
 *
 *   product media   image/jpeg png webp heic svg+xml
 *   store + profile the above, plus gif
 *   certifications  application/pdf, msword, docx, plus the image types
 *
 * Deliberately framework-free: it throws its own error type rather than a
 * `MedusaError` so it stays a pure function that can be unit tested without
 * booting Medusa. The route translates the error at the boundary.
 */

/** Canonical MIME type per extension, plus any variants seen in the wild. */
const ALLOWED_UPLOADS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    jpg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
    jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
    png: ['image/png'],
    webp: ['image/webp'],
    gif: ['image/gif'],
    heic: ['image/heic', 'image/heif'],
    heif: ['image/heif', 'image/heic'],
    svg: ['image/svg+xml'],
    pdf: ['application/pdf'],
    doc: ['application/msword'],
    docx: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel']
  })

/**
 * Browsers send this when they cannot work out a type, and so does curl
 * without an explicit header. Treated as "no opinion" rather than a mismatch,
 * and replaced with the canonical type for the extension.
 */
const GENERIC_MIME = 'application/octet-stream'

/**
 * Extensions whose first bytes we verify. A seller renaming `shell.php` to
 * `logo.png` gets past the extension check but not this one.
 *
 * Three types are not in this table because a fixed prefix cannot express
 * them, and each has its own check below: SVG is text with no signature at
 * all, while WEBP and HEIC/HEIF are container formats whose identifying
 * marker sits at a byte offset rather than at the start. Every allowed
 * extension is covered by one mechanism or the other — leaving one out
 * would make it the obvious extension to rename a payload to.
 */
const MAGIC_BYTES: Readonly<Record<string, readonly number[][]>> = Object.freeze(
  {
    png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    jpg: [[0xff, 0xd8, 0xff]],
    jpeg: [[0xff, 0xd8, 0xff]],
    gif: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
    ],
    pdf: [[0x25, 0x50, 0x44, 0x46, 0x2d]],
    doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
    // Any zip local-file header — .docx is a zip container.
    docx: [[0x50, 0x4b]]
  }
)

/** ISO base media brands that identify a HEIC/HEIF still image. */
const HEIC_BRANDS = Object.freeze([
  'heic',
  'heix',
  'heim',
  'heis',
  'hevc',
  'hevx',
  'hevm',
  'hevs',
  'mif1',
  'msf1'
])

/**
 * SVG is the one allowed type that is executable. A logo carrying
 * `<script>` or a `javascript:` href becomes stored XSS the moment anyone
 * opens the file's URL directly. Real logos never need either, so refusing
 * them costs nothing.
 */
const SVG_ACTIVE_CONTENT = /<script[\s>]|javascript:|<foreignObject[\s>]/i

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024
const DEFAULT_MAX_FILES = 20

/** Longest filename we keep before truncating; the key also carries a ULID. */
const MAX_NAME_LENGTH = 100

export class UploadRejectedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadRejectedError'
  }
}

const positiveIntFromEnv = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

/** Per-file byte ceiling. `multer` enforces it; the route reports it. */
export const maxUploadBytes = (): number =>
  positiveIntFromEnv('MARKETPLACE_UPLOAD_MAX_BYTES', DEFAULT_MAX_BYTES)

/** Files accepted in one request, to bound memory on a single call. */
export const maxUploadFiles = (): number =>
  positiveIntFromEnv('MARKETPLACE_UPLOAD_MAX_FILES', DEFAULT_MAX_FILES)

export const allowedExtensions = (): string[] =>
  Object.keys(ALLOWED_UPLOADS).sort()

/** Every MIME type any allowed extension accepts, for `accept` headers. */
export const allowedMimeTypes = (): string[] =>
  Array.from(new Set(Object.values(ALLOWED_UPLOADS).flat())).sort()

/** Strip parameters and casing: `IMAGE/PNG; charset=x` -> `image/png`. */
export const normaliseMimeType = (raw?: string | null): string =>
  (raw || '').split(';')[0].trim().toLowerCase()

/**
 * Trailing extension of a filename, lowercased and without the dot.
 * Returns '' for dotfiles and names with no extension, both of which then
 * fall through to being derived from the MIME type.
 */
export const extensionOf = (filename?: string | null): string => {
  const base = String(filename || '')
    .split(/[\\/]/)
    .pop()!
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  return base.slice(dot + 1).toLowerCase()
}

/**
 * Reduce a client-supplied filename to something safe to embed in an object
 * key. The provider builds keys as `${prefix}${name}-${ulid}${ext}`, so
 * whatever survives here ends up in the key and in the public URL.
 */
export const sanitiseFileName = (raw: string | null | undefined): string => {
  const base = String(raw || '')
    .split(/[\\/]/)
    .pop()!
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base

  const cleaned = stem
    .normalize('NFKD')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-._]+/, '')
    .replace(/[-._]+$/, '')
    .slice(0, MAX_NAME_LENGTH)

  return cleaned || 'file'
}

const matchesAnySignature = (
  buffer: Buffer,
  signatures: readonly number[][]
): boolean =>
  signatures.some(
    (signature) =>
      buffer.length >= signature.length &&
      signature.every((byte, index) => buffer[index] === byte)
  )

const looksLikeHeic = (buffer: Buffer): boolean => {
  if (buffer.length < 12) return false
  if (buffer.toString('latin1', 4, 8) !== 'ftyp') return false
  return HEIC_BRANDS.includes(buffer.toString('latin1', 8, 12).toLowerCase())
}

/** RIFF container with a WEBP form type; bytes 4-7 are the chunk length. */
const looksLikeWebp = (buffer: Buffer): boolean =>
  buffer.length >= 12 &&
  buffer.toString('latin1', 0, 4) === 'RIFF' &&
  buffer.toString('latin1', 8, 12) === 'WEBP'

/** UTF-8 text with no NULs or script markers. CSV has no fixed signature. */
const looksLikeCsv = (buffer: Buffer): boolean => {
  if (buffer.includes(0)) return false
  const head = buffer.toString('utf8', 0, Math.min(buffer.length, 1024))
  return !/<\?php|<script[\s>]|javascript:/i.test(head)
}

/** Extensions verified by an offset marker rather than a leading signature. */
const OFFSET_CHECKS: Readonly<Record<string, (buffer: Buffer) => boolean>> =
  Object.freeze({
    webp: looksLikeWebp,
    heic: looksLikeHeic,
    heif: looksLikeHeic,
    csv: looksLikeCsv
  })

const assertSvgIsInert = (buffer: Buffer): void => {
  // A leading XML declaration, comments or a BOM are all legal, so scan a
  // window rather than requiring '<svg' at byte zero.
  const head = buffer.toString('utf8', 0, Math.min(buffer.length, 4096))
  if (!/<svg[\s>]/i.test(head) && !/<\?xml[\s>]/i.test(head)) {
    throw new UploadRejectedError('This file is not an SVG image.')
  }
  const text = buffer.toString('utf8')
  if (SVG_ACTIVE_CONTENT.test(text)) {
    throw new UploadRejectedError(
      'This SVG contains scripting and cannot be uploaded. Export it as a plain image, or upload a PNG instead.'
    )
  }
}

/**
 * Verify the bytes match the extension we are about to store the file under.
 * Only runs for extensions we hold a signature for; anything else passes,
 * because a missing signature is not evidence of a mismatch.
 */
export const assertBytesMatchExtension = (
  buffer: Buffer | null | undefined,
  extension: string
): void => {
  if (!buffer || !buffer.length) return

  if (extension === 'svg') return assertSvgIsInert(buffer)

  const mismatch = () =>
    new UploadRejectedError(
      `This file’s contents do not match its .${extension} extension.`
    )

  const offsetCheck = OFFSET_CHECKS[extension]
  if (offsetCheck) {
    if (!offsetCheck(buffer)) throw mismatch()
    return
  }

  const signatures = MAGIC_BYTES[extension]
  if (!signatures) return

  if (!matchesAnySignature(buffer, signatures)) throw mismatch()
}

export interface ApprovedUpload {
  filename: string
  mimeType: string
  extension: string
}

const PUBLIC_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'heic',
  'heif',
  'svg'
])

const PRIVATE_DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'csv'])

export type UploadVisibility = 'public' | 'private'

/**
 * Shop media is world-readable. Receipts and certification proofs are not.
 * An explicit `purpose` wins; otherwise the extension decides. Unknown types
 * fail closed to private — a stray file becoming public is worse than a
 * product image briefly needing a signed URL.
 */
export const visibilityForUpload = ({
  extension,
  purpose
}: {
  extension?: string | null
  purpose?: string | null
} = {}): UploadVisibility => {
  const requested = String(purpose || '').trim().toLowerCase()
  if (requested === 'public' || requested === 'private') return requested
  const ext = String(extension || '').replace(/^\./, '').toLowerCase()
  if (PUBLIC_IMAGE_EXTENSIONS.has(ext)) return 'public'
  if (PRIVATE_DOCUMENT_EXTENSIONS.has(ext)) return 'private'
  return 'private'
}

export const prefixForVisibility = (visibility: UploadVisibility): string =>
  visibility === 'public'
    ? 'marketplace/uploads/public/'
    : 'marketplace/uploads/private/'

export interface UploadCandidate {
  filename?: string | null
  mimeType?: string | null
  buffer?: Buffer | null
}

/**
 * Validate one vendor upload and return the sanitised values to store under.
 *
 * Callers must use the returned `filename` and `mimeType` rather than the
 * originals: the extension may have been derived from the MIME type, a
 * generic type resolved to a canonical one, and the name stripped of
 * characters that have no business in an object key.
 *
 * @throws {UploadRejectedError} with a message safe to show to the seller.
 */
export const assertUploadAllowed = ({
  filename,
  mimeType,
  buffer
}: UploadCandidate = {}): ApprovedUpload => {
  const declaredMime = normaliseMimeType(mimeType)
  let extension = extensionOf(filename)

  // No usable extension on the name: fall back to the declared type. Keeps
  // legitimate uploads working while still ending up with a correct key.
  if (!extension || !ALLOWED_UPLOADS[extension]) {
    const derived = Object.keys(ALLOWED_UPLOADS).find((candidate) =>
      ALLOWED_UPLOADS[candidate].includes(declaredMime)
    )
    if (!derived) {
      const label = extension ? '.' + extension + ' files' : 'This file type'
      throw new UploadRejectedError(
        `${label} cannot be uploaded. Allowed types: ${allowedExtensions().join(', ')}.`
      )
    }
    extension = derived
  }

  const permitted = ALLOWED_UPLOADS[extension]

  // An extension we accept paired with a type we do not is either a
  // mislabelled upload or an attempt to have the file served as something
  // else. Either way it does not get stored.
  if (declaredMime && declaredMime !== GENERIC_MIME) {
    if (!permitted.includes(declaredMime)) {
      throw new UploadRejectedError(
        `A .${extension} file cannot be uploaded as ${declaredMime}.`
      )
    }
  }

  assertBytesMatchExtension(buffer, extension)

  return {
    filename: `${sanitiseFileName(filename)}.${extension}`,
    mimeType: permitted[0],
    extension
  }
}
