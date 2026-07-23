import { model } from '@medusajs/framework/utils'

export const SellerCertification = model.define('seller_certification', {
  id: model.id({ prefix: 'sercer' }).primaryKey(),
  seller_id: model.text(),
  certification_slug: model.text(),
  document_url: model.text().nullable(),
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
