import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  QUOTATION_MODULE,
  QuotationModuleService,
} from "@mercurjs/quotation"

type CreateQuotationInput = {
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

export const createQuotationStep = createStep(
  "create-quotation",
  async (input: CreateQuotationInput, { container }) => {
    const service =
      container.resolve<QuotationModuleService>(QUOTATION_MODULE)

    const quotation = await service.createQuotationVersions({
      rfq_request_id: input.rfq_request_id,
      seller_id: input.seller_id,
      total_amount: input.total_amount,
      currency_code: input.currency_code,
      valid_until: input.valid_until,
      delivery_days: input.delivery_days,
      notes: input.notes,
      seller_message: input.seller_message,
      status: "sent",
      version_number: 1,
    })

    const quoteId = (quotation as { id: string }).id

    // Create line items
    if (input.line_items?.length) {
      for (const item of input.line_items) {
        await service.createQuotationLineItems({
          ...item,
          currency_code: input.currency_code,
          quotation_version_id: quoteId,
        })
      }
    }

    // Create terms
    if (input.terms?.length) {
      for (const term of input.terms) {
        await service.createQuotationTerms({
          ...term,
          quotation_version_id: quoteId,
        })
      }
    }

    // Transition RFQ status to quoting
    await service.transitionRfqStatus(input.rfq_request_id, "quoting" as never)

    return new StepResponse(quotation, quoteId)
  },
  async (quoteId: string, { container }) => {
    const service =
      container.resolve<QuotationModuleService>(QUOTATION_MODULE)

    await service.deleteQuotationVersions([quoteId])
  }
)
