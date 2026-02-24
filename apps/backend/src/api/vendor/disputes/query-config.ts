export const vendorDisputeFields = [
  'id', 'escrow_transaction_id', 'order_id',
  'initiated_by', 'initiator_type', 'reason', 'status',
  'description', 'evidence_deadline',
  'created_at', 'updated_at'
]

export const vendorDisputeDetailFields = [
  ...vendorDisputeFields,
  'buyer_evidence', 'seller_evidence',
  'admin_notes', 'resolution_type', 'resolution_amount',
  'resolved_by', 'resolved_at', 'metadata'
]

export const vendorDisputeQueryConfig = {
  list: { defaults: vendorDisputeFields, isList: true },
  retrieve: { defaults: vendorDisputeDetailFields, isList: false }
}
