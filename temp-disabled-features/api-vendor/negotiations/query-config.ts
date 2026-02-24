export const vendorNegotiationFields = [
  'id', 'rfq_request_id', 'quotation_version_id',
  'buyer_id', 'seller_id', 'status',
  'talkjs_conversation_id', 'proposal_count',
  'last_activity_at', 'created_at', 'updated_at'
]

export const vendorNegotiationDetailFields = [
  ...vendorNegotiationFields,
  'messages.*', 'attachments.*',
  'closed_at', 'closed_reason', 'metadata'
]

export const vendorNegotiationQueryConfig = {
  list: { defaults: vendorNegotiationFields, isList: true },
  retrieve: { defaults: vendorNegotiationDetailFields, isList: false }
}
