import { model } from '@medusajs/framework/utils'

/**
 * Business verification (KYB) — one row per submitted business document.
 *
 * A seller may have several rows over time (declined → re-upload); the
 * seller's effective state is derived from the set, never stored on the
 * seller (see utils/business-verification.ts). Never a public badge and
 * never a ranking input (G-11). Documents live on the private bucket and
 * are only ever read through short-lived presigned links (G-12).
 *
 * Field-for-field mirror of the platform's
 * KYCApplication.company.business_registration so a future merge is a
 * rename, not a migration.
 */
export const SellerVerification = model.define('seller_verification', {
  id: model.id({ prefix: 'sverif' }).primaryKey(),
  seller_id: model.text(),
  // Private object key (marketplace/uploads/private/…); never a public URL.
  document_key: model.text(),
  document_url: model.text(),
  document_filename: model.text().nullable(),
  document_kind: model.enum([
    'certificate_of_incorporation',
    'registration_extract',
    'trade_licence',
    'tax_registration'
  ]),
  legal_name: model.text(),
  registration_number: model.text(),
  // ISO 3166-1 alpha-2, lowercase.
  country_of_registration: model.text(),
  // What OCR suggested before the vendor confirmed/corrected — kept so a
  // reviewer can see extracted vs typed side by side.
  ocr_prefill: model.json().nullable(),
  status: model.enum(['pending', 'verified', 'rejected', 'archived']),
  verification_method: model
    .enum(['document_only', 'registry_checked'])
    .nullable(),
  reviewed_by: model.text().nullable(),
  reviewed_at: model.dateTime().nullable(),
  reviewer_note: model.text().nullable(),
  // Snapshot of the duplicate signals the reviewer saw when deciding.
  duplicate_signals: model.json().nullable()
})
