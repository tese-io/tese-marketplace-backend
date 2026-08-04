import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type VendorGetSellerCertificationsParamsType = z.infer<
  typeof VendorGetSellerCertificationsParams
>

export const VendorGetSellerCertificationsParams = createFindParams({
  limit: 50,
  offset: 0
}).merge(
  z.object({
    verification_status: z
      .enum(['pending', 'verified', 'rejected', 'expired'])
      .optional()
  })
)

/**
 * @schema VendorAttachSellerCertification
 * type: object
 * required:
 *   - certification_slug
 *   - documents
 * properties:
 *   certification_slug:
 *     type: string
 *     description: Slug of the certification from the shared catalogue
 *   documents:
 *     type: array
 *     minItems: 1
 *     description: One or more proof documents. Combine uploaded files (kind='file') with links to certification body registries (kind='url').
 *     items:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *         filename:
 *           type: string
 *           nullable: true
 *         kind:
 *           type: string
 *           enum: [file, url]
 *   document_url:
 *     type: string
 *     format: uri
 *     nullable: true
 *     description: Deprecated — single-proof legacy field. If provided and `documents` is empty, treated as one document. New clients should send `documents` only.
 *   expires_at:
 *     type: string
 *     format: date-time
 *     nullable: true
 *     description: Certification expiry date
 */
export type CertificationDocumentInput = {
  url: string
  filename?: string | null
  kind?: 'file' | 'url'
}

const DocumentSchema = z.object({
  url: z.string().url({ message: 'Each proof document must be a valid URL' }),
  filename: z.string().nullish(),
  kind: z.enum(['file', 'url']).optional()
})

export type VendorAttachSellerCertificationType = z.infer<
  typeof VendorAttachSellerCertification
>
export const VendorAttachSellerCertification = z
  .object({
    certification_slug: z.string().min(1),
    // Preferred field going forward: an array of {url, filename?, kind?}.
    // Nullish so we can accept legacy payloads that only send document_url;
    // the .transform below normalises so the route always sees .documents.
    documents: z.array(DocumentSchema).min(1).nullish(),
    // Legacy single-URL field. Left optional so old clients keep working
    // during the deploy window; if provided and `documents` is empty we
    // promote it into a one-entry documents array.
    document_url: z.string().url().nullish(),
    expires_at: z.coerce.date().nullish()
  })
  .transform((v) => {
    let documents = v.documents ?? []
    if (documents.length === 0 && v.document_url) {
      documents = [{ url: v.document_url, kind: 'url' as const }]
    }
    return { ...v, documents }
  })
  .refine((v) => v.documents.length >= 1, {
    message: 'At least one proof document is required',
    path: ['documents']
  })
