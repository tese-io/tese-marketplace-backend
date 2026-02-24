import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  QUOTATION_MODULE,
  QuotationModuleService,
} from "@mercurjs/quotation"

type CreateRfqInput = {
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

export const createRfqRequestStep = createStep(
  "create-rfq-request",
  async (input: CreateRfqInput, { container }) => {
    const service =
      container.resolve<QuotationModuleService>(QUOTATION_MODULE)

    const rfq = await service.createRfqRequests({
      ...input,
      status: "submitted",
    })

    return new StepResponse(rfq, (rfq as { id: string }).id)
  },
  async (rfqId: string, { container }) => {
    const service =
      container.resolve<QuotationModuleService>(QUOTATION_MODULE)

    await service.deleteRfqRequests([rfqId])
  }
)
