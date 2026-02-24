export const adminEscrowFields = [
  'id', 'order_id', 'quotation_version_id',
  'buyer_id', 'seller_id', 'type', 'status',
  'total_amount', 'held_amount', 'released_amount',
  'refunded_amount', 'platform_fee', 'currency_code',
  'held_at', 'released_at', 'auto_release_at',
  'created_at', 'updated_at'
]

export const adminEscrowDetailFields = [
  ...adminEscrowFields,
  'releases.*', 'metadata',
  'stripe_payment_intent_id', 'stripe_transfer_id', 'stripe_charge_id'
]

export const adminEscrowQueryConfig = {
  list: { defaults: adminEscrowFields, isList: true },
  retrieve: { defaults: adminEscrowDetailFields, isList: false }
}
