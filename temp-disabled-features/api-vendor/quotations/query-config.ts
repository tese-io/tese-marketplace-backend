export const vendorQuotationFields = [
  'id', 'version_number', 'status', 'seller_id',
  'total_amount', 'currency_code', 'valid_until',
  'delivery_days', 'notes', 'rfq_request_id',
  'is_counter_proposal', 'created_at', 'updated_at'
]

export const vendorQuotationQueryConfig = {
  list: { defaults: vendorQuotationFields, isList: true },
  retrieve: { defaults: [...vendorQuotationFields, 'line_items.*', 'terms.*', 'metadata'], isList: false }
}
