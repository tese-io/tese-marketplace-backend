import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  QUOTATION_MODULE,
  QuotationModuleService,
} from "@mercurjs/quotation"

export const acceptQuotationStep = createStep(
  "accept-quotation",
  async (input: { quotation_version_id: string }, { container }) => {
    const service =
      container.resolve<QuotationModuleService>(QUOTATION_MODULE)

    const result = await service.acceptQuotation(input.quotation_version_id)

    return new StepResponse(result, input.quotation_version_id)
  }
)
