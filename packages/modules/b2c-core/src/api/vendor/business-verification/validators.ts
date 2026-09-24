import { z } from 'zod'

import {
  DOCUMENT_KINDS,
  isPrivateUploadKey,
  normalizeCountryCode
} from '../../../utils/business-verification'

/**
 * @schema VendorSubmitBusinessVerification
 * type: object
 * required:
 *   - document_key
 *   - document_url
 *   - document_kind
 *   - legal_name
 *   - registration_number
 *   - country_of_registration
 * properties:
 *   document_key:
 *     type: string
 *     description: Private object key returned by POST /vendor/uploads?purpose=private
 *   document_url:
 *     type: string
 *   document_filename:
 *     type: string
 *     nullable: true
 *   document_kind:
 *     type: string
 *     enum: [certificate_of_incorporation, registration_extract, trade_licence, tax_registration]
 *   legal_name:
 *     type: string
 *   registration_number:
 *     type: string
 *   country_of_registration:
 *     type: string
 *     description: ISO 3166-1 alpha-2
 *   ocr_prefill:
 *     type: object
 *     nullable: true
 */
export type VendorSubmitBusinessVerificationType = z.infer<
  typeof VendorSubmitBusinessVerification
>
export const VendorSubmitBusinessVerification = z.object({
  document_key: z
    .string()
    .refine(isPrivateUploadKey, {
      message: 'document_key must be a private upload from this store'
    }),
  document_url: z.string().url(),
  document_filename: z.string().max(255).nullish(),
  document_kind: z.enum(DOCUMENT_KINDS),
  legal_name: z.string().trim().min(2).max(200),
  registration_number: z.string().trim().min(2).max(64),
  country_of_registration: z
    .string()
    .transform((v) => normalizeCountryCode(v))
    .refine((v): v is string => Boolean(v), {
      message: 'country_of_registration must be an ISO 3166-1 alpha-2 code'
    }),
  ocr_prefill: z.record(z.unknown()).nullish()
})

export type VendorPrefillBusinessVerificationType = z.infer<
  typeof VendorPrefillBusinessVerification
>
export const VendorPrefillBusinessVerification = z.object({
  document_key: z
    .string()
    .refine(isPrivateUploadKey, {
      message: 'document_key must be a private upload from this store'
    }),
  mime_type: z.string().max(100).nullish()
})
