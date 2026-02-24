export const vendorEscrowFields = [
  'id', 'order_id', 'buyer_id', 'seller_id', 'type', 'status',
  'total_amount', 'held_amount', 'released_amount', 'refunded_amount',
  'platform_fee', 'currency_code', 'held_at', 'released_at',
  'auto_release_at', 'created_at', 'updated_at'
]

export const vendorEscrowQueryConfig = {
  list: { defaults: vendorEscrowFields, isList: true },
  retrieve: { defaults: [...vendorEscrowFields, 'releases.*', 'metadata'], isList: false }
}
