import { WorkflowResponse, createWorkflow } from "@medusajs/workflows-sdk"
import { createQuotationStep } from "../steps"

type CreateQuotationWorkflowInput = {
  rfq_request_id: string
  seller_id: string
  total_amount: number
  currency_code: string
  valid_until: Date
  delivery_days?: number
  notes?: string
  seller_message?: string
  line_items?: Array<{
    title: string
    quantity: number
    unit_price: number
    total_price: number
    product_id?: string
    service_id?: string
  }>
  terms?: Array<{
    type: string
    title: string
    description: string
    is_required?: boolean
  }>
}

export const createQuotationWorkflow = createWorkflow(
  "create-quotation",
  function (input: CreateQuotationWorkflowInput) {
    return new WorkflowResponse(createQuotationStep(input))
  }
)
