export const storeNegotiationFields = [
  'id', 'rfq_request_id', 'quotation_version_id',
  'buyer_id', 'seller_id', 'status',
  'talkjs_conversation_id', 'proposal_count',
  'last_activity_at', 'created_at', 'updated_at'
]

export const storeNegotiationDetailFields = [
  ...storeNegotiationFields,
  'messages.*', 'attachments.*',
  'closed_at', 'closed_reason', 'metadata'
]

export const storeNegotiationQueryConfig = {
  list: { defaults: storeNegotiationFields, isList: true },
  retrieve: { defaults: storeNegotiationDetailFields, isList: false }
}
