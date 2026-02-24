import { Context } from "@medusajs/framework/types"
import {
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import {
  RfqRequest,
  RfqStatus,
  QuotationVersion,
  QuoteStatus,
  QuotationTerm,
  QuotationLineItem,
} from "./models"

const MAX_NEGOTIATION_ROUNDS = 5

class QuotationModuleService extends MedusaService({
  RfqRequest,
  QuotationVersion,
  QuotationTerm,
  QuotationLineItem,
}) {
  /**
   * Validates RFQ status transition
   */
  private validateRfqTransition(
    currentStatus: RfqStatus,
    newStatus: RfqStatus
  ): void {
    const allowedTransitions: Record<RfqStatus, RfqStatus[]> = {
      [RfqStatus.DRAFT]: [RfqStatus.SUBMITTED, RfqStatus.CANCELLED],
      [RfqStatus.SUBMITTED]: [
        RfqStatus.QUOTING,
        RfqStatus.CANCELLED,
        RfqStatus.EXPIRED,
      ],
      [RfqStatus.QUOTING]: [
        RfqStatus.QUOTED,
        RfqStatus.CANCELLED,
        RfqStatus.EXPIRED,
      ],
      [RfqStatus.QUOTED]: [
        RfqStatus.IN_NEGOTIATION,
        RfqStatus.ACCEPTED,
        RfqStatus.REJECTED,
        RfqStatus.EXPIRED,
      ],
      [RfqStatus.IN_NEGOTIATION]: [
        RfqStatus.ACCEPTED,
        RfqStatus.REJECTED,
        RfqStatus.EXPIRED,
        RfqStatus.CANCELLED,
      ],
      [RfqStatus.ACCEPTED]: [RfqStatus.CONVERTED],
      [RfqStatus.REJECTED]: [],
      [RfqStatus.EXPIRED]: [],
      [RfqStatus.CONVERTED]: [],
      [RfqStatus.CANCELLED]: [],
    }

    const allowed = allowedTransitions[currentStatus] || []
    if (!allowed.includes(newStatus)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot transition RFQ from "${currentStatus}" to "${newStatus}"`
      )
    }
  }

  /**
   * Validates quote status transition
   */
  private validateQuoteTransition(
    currentStatus: QuoteStatus,
    newStatus: QuoteStatus
  ): void {
    const allowedTransitions: Record<QuoteStatus, QuoteStatus[]> = {
      [QuoteStatus.DRAFT]: [QuoteStatus.SENT, QuoteStatus.WITHDRAWN],
      [QuoteStatus.SENT]: [
        QuoteStatus.VIEWED,
        QuoteStatus.EXPIRED,
        QuoteStatus.WITHDRAWN,
      ],
      [QuoteStatus.VIEWED]: [
        QuoteStatus.IN_NEGOTIATION,
        QuoteStatus.ACCEPTED,
        QuoteStatus.REJECTED,
        QuoteStatus.EXPIRED,
      ],
      [QuoteStatus.IN_NEGOTIATION]: [
        QuoteStatus.ACCEPTED,
        QuoteStatus.REJECTED,
        QuoteStatus.EXPIRED,
        QuoteStatus.WITHDRAWN,
      ],
      [QuoteStatus.ACCEPTED]: [QuoteStatus.CONVERTED],
      [QuoteStatus.REJECTED]: [],
      [QuoteStatus.EXPIRED]: [],
      [QuoteStatus.WITHDRAWN]: [],
      [QuoteStatus.CONVERTED]: [],
    }

    const allowed = allowedTransitions[currentStatus] || []
    if (!allowed.includes(newStatus)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot transition quote from "${currentStatus}" to "${newStatus}"`
      )
    }
  }

  /**
   * Transition RFQ to a new status with validation
   */
  @InjectTransactionManager()
  async transitionRfqStatus(
    rfqId: string,
    newStatus: RfqStatus,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const rfq = await this.retrieveRfqRequest(rfqId, {})
    this.validateRfqTransition(rfq.status as RfqStatus, newStatus)
    return await this.updateRfqRequests(
      { id: rfqId, status: newStatus },
      sharedContext
    )
  }

  /**
   * Transition quote to a new status with validation
   */
  @InjectTransactionManager()
  async transitionQuoteStatus(
    quoteId: string,
    newStatus: QuoteStatus,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const quote = await this.retrieveQuotationVersion(quoteId, {})
    this.validateQuoteTransition(quote.status as QuoteStatus, newStatus)
    return await this.updateQuotationVersions(
      { id: quoteId, status: newStatus },
      sharedContext
    )
  }

  /**
   * Create a new quotation version (counter-proposal)
   */
  @InjectTransactionManager()
  async createCounterProposal(
    input: {
      rfq_request_id: string
      parent_version_id: string
      proposed_by: string
      total_amount: number
      currency_code: string
      valid_until: Date
      notes?: string
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
      }>
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const parentQuote = await this.retrieveQuotationVersion(
      input.parent_version_id,
      { relations: ["rfq_request"] }
    )

    // Count existing versions for this RFQ
    const existingVersions = await this.listQuotationVersions(
      { rfq_request_id: input.rfq_request_id },
      {}
    )

    const negotiationRounds = existingVersions.filter(
      (v: { is_counter_proposal: boolean }) => v.is_counter_proposal
    ).length

    if (negotiationRounds >= MAX_NEGOTIATION_ROUNDS) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Maximum negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) reached for this RFQ`
      )
    }

    // Mark parent as in_negotiation
    await this.transitionQuoteStatus(
      input.parent_version_id,
      QuoteStatus.IN_NEGOTIATION,
      sharedContext
    )

    // Create new version
    const newVersion = await this.createQuotationVersions(
      {
        rfq_request_id: input.rfq_request_id,
        version_number: existingVersions.length + 1,
        status: QuoteStatus.SENT,
        seller_id: parentQuote.seller_id,
        total_amount: input.total_amount,
        currency_code: input.currency_code,
        valid_until: input.valid_until,
        notes: input.notes,
        is_counter_proposal: true,
        proposed_by: input.proposed_by,
        parent_version_id: input.parent_version_id,
      },
      sharedContext
    )

    // Create line items if provided
    if (input.line_items?.length) {
      for (const item of input.line_items) {
        await this.createQuotationLineItems(
          {
            ...item,
            currency_code: input.currency_code,
            quotation_version_id: (newVersion as { id: string }).id,
          },
          sharedContext
        )
      }
    }

    // Create terms if provided
    if (input.terms?.length) {
      for (const term of input.terms) {
        await this.createQuotationTerms(
          {
            ...term,
            quotation_version_id: (newVersion as { id: string }).id,
          },
          sharedContext
        )
      }
    }

    // Update RFQ status
    await this.transitionRfqStatus(
      input.rfq_request_id,
      RfqStatus.IN_NEGOTIATION,
      sharedContext
    )

    return newVersion
  }

  /**
   * Accept a quotation and transition RFQ to accepted
   */
  @InjectTransactionManager()
  async acceptQuotation(
    quoteId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const quote = await this.retrieveQuotationVersion(quoteId, {
      relations: ["rfq_request"],
    })

    await this.transitionQuoteStatus(
      quoteId,
      QuoteStatus.ACCEPTED,
      sharedContext
    )

    // Reject all other quotes for this RFQ
    const otherQuotes = await this.listQuotationVersions(
      { rfq_request_id: quote.rfq_request_id },
      {}
    )

    for (const otherQuote of otherQuotes) {
      if (
        (otherQuote as { id: string }).id !== quoteId &&
        [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.IN_NEGOTIATION].includes(
          (otherQuote as { status: QuoteStatus }).status
        )
      ) {
        await this.updateQuotationVersions(
          { id: (otherQuote as { id: string }).id, status: QuoteStatus.REJECTED },
          sharedContext
        )
      }
    }

    await this.transitionRfqStatus(
      quote.rfq_request_id,
      RfqStatus.ACCEPTED,
      sharedContext
    )

    return quote
  }

  /**
   * Expire quotes that have passed their valid_until date
   */
  async expireOverdueQuotes() {
    const now = new Date()
    const overdueQuotes = await this.listQuotationVersions(
      {
        status: [QuoteStatus.SENT, QuoteStatus.VIEWED],
      },
      {}
    )

    const expired: string[] = []
    for (const quote of overdueQuotes) {
      const q = quote as { id: string; valid_until: Date }
      if (q.valid_until && new Date(q.valid_until) < now) {
        await this.updateQuotationVersions({
          id: q.id,
          status: QuoteStatus.EXPIRED,
        })
        expired.push(q.id)
      }
    }
    return expired
  }

  /**
   * Convert accepted quotation to order reference
   */
  @InjectTransactionManager()
  async convertQuoteToOrder(
    quoteId: string,
    orderId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const quote = await this.retrieveQuotationVersion(quoteId, {})

    if ((quote as { status: string }).status !== QuoteStatus.ACCEPTED) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only accepted quotations can be converted to orders"
      )
    }

    await this.updateQuotationVersions(
      { id: quoteId, status: QuoteStatus.CONVERTED, order_id: orderId },
      sharedContext
    )

    const rfqId = (quote as { rfq_request_id: string }).rfq_request_id
    await this.updateRfqRequests(
      { id: rfqId, status: RfqStatus.CONVERTED },
      sharedContext
    )

    return quote
  }
}

export default QuotationModuleService
