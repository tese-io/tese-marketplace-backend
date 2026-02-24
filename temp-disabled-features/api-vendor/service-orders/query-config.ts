export const vendorServiceOrderFields = [
  'id', 'order_id', 'service_id', 'service_tier_id',
  'seller_id', 'buyer_id', 'status',
  'total_amount', 'currency_code',
  'started_at', 'expected_completion_at', 'completed_at',
  'revision_count', 'max_revisions',
  'created_at', 'updated_at'
]

export const vendorServiceOrderQueryConfig = {
  list: { defaults: vendorServiceOrderFields, isList: true },
  retrieve: { defaults: [...vendorServiceOrderFields, 'milestones.*', 'buyer_notes', 'seller_notes', 'metadata'], isList: false }
}
