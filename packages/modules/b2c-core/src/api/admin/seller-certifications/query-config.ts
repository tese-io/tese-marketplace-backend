export const adminSellerCertificationFields = [
  'id',
  'seller_id',
  'certification_slug',
  'document_url',
  'verification_status',
  'verified_by',
  'verified_at',
  'verification_notes',
  'expires_at',
  'created_at',
  'updated_at'
]

export const adminSellerCertificationQueryConfig = {
  list: {
    defaults: adminSellerCertificationFields,
    isList: true
  },
  retrieve: {
    defaults: adminSellerCertificationFields,
    isList: false
  }
}
