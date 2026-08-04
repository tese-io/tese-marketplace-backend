import { model } from '@medusajs/framework/utils'

export const SellerCertification = model.define('seller_certification', {
  id: model.id({ prefix: 'sercer' }).primaryKey(),
  seller_id: model.text(),
  certification_slug: model.text(),
  // Legacy single-URL field. New writes go into `documents`; kept
  // nullable so older rows still read. Migration 20260803* backfills
  // pre-existing values into documents[0] so the admin queue never
  // shows empty for old records.
  document_url: model.text().nullable(),
  // Multi-doc proof: sellers can attach the cert PDF *plus* a link to
  // the certification body's verification registry, or multi-page
  // scans, etc. Each entry: {url, filename?, kind}. `kind` = 'file'
  // when uploaded via /vendor/uploads, 'url' when pasted.
  documents: model.json(),
  verification_status: model.enum([
    'pending',
    'verified',
    'rejected',
    'expired'
  ]),
  verified_by: model.text().nullable(),
  verified_at: model.dateTime().nullable(),
  verification_notes: model.text().nullable(),
  expires_at: model.dateTime().nullable()
})
