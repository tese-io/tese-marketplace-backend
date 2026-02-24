export const adminDisputeFields = [
  'id', 'escrow_transaction_id', 'order_id',
  'initiated_by', 'initiator_type', 'reason', 'status',
  'description', 'evidence_deadline',
  'created_at', 'updated_at'
]

export const adminDisputeDetailFields = [
  ...adminDisputeFields,
  'buyer_evidence', 'seller_evidence',
  'admin_notes', 'resolution_type', 'resolution_amount',
  'resolved_by', 'resolved_at', 'metadata'
]

export const adminDisputeQueryConfig = {
  list: { defaults: adminDisputeFields, isList: true },
  retrieve: { defaults: adminDisputeDetailFields, isList: false }
}
