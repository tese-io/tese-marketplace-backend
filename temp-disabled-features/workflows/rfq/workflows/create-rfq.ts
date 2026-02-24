import { WorkflowResponse, createWorkflow } from "@medusajs/workflows-sdk"
import { createRfqRequestStep } from "../steps"

type CreateRfqWorkflowInput = {
  title: string
  description?: string
  type: string
  customer_id: string
  seller_id?: string
  product_id?: string
  service_id?: string
  quantity?: number
  unit?: string
  budget_min?: number
  budget_max?: number
  currency_code?: string
  specifications?: Record<string, unknown>
  deadline?: Date
  expires_at?: Date
}

export const createRfqWorkflow = createWorkflow(
  "create-rfq",
  function (input: CreateRfqWorkflowInput) {
    return new WorkflowResponse(createRfqRequestStep(input))
  }
)
