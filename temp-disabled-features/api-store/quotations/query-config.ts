export const storeQuotationFields = [
  'id', 'version_number', 'status', 'seller_id',
  'total_amount', 'currency_code', 'valid_until',
  'delivery_days', 'notes', 'seller_message',
  'is_counter_proposal', 'rfq_request_id',
  'created_at', 'updated_at'
]

export const storeQuotationDetailFields = [
  ...storeQuotationFields,
  'line_items.*', 'terms.*',
  'buyer_message', 'proposed_by', 'parent_version_id',
  'metadata'
]

export const storeQuotationQueryConfig = {
  list: { defaults: storeQuotationFields, isList: true },
  retrieve: { defaults: storeQuotationDetailFields, isList: false }
}
