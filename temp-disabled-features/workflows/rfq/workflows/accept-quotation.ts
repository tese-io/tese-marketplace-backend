import { WorkflowResponse, createWorkflow } from "@medusajs/workflows-sdk"
import { acceptQuotationStep } from "../steps"

export const acceptQuotationWorkflow = createWorkflow(
  "accept-quotation",
  function (input: { quotation_version_id: string }) {
    return new WorkflowResponse(acceptQuotationStep(input))
  }
)
