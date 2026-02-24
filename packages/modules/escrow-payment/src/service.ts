import { Context } from "@medusajs/framework/types"
import {
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import {
  EscrowTransaction,
  EscrowStatus,
  EscrowType,
  PaymentRelease,
  ReleaseStatus,
  ReleaseTrigger,
  DisputeCase,
  DisputeStatus,
} from "./models"

class EscrowPaymentModuleService extends MedusaService({
  EscrowTransaction,
  PaymentRelease,
  DisputeCase,
}) {
  /**
   * Create an escrow hold for an order
   */
  @InjectTransactionManager()
  async createEscrowHold(
    input: {
      order_id: string
      quotation_version_id?: string
      buyer_id: string
      seller_id: string
      type: EscrowType
      total_amount: number
      platform_fee?: number
      currency_code: string
      stripe_payment_intent_id?: string
      stripe_charge_id?: string
      auto_release_days?: number
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const autoReleaseAt = input.auto_release_days
      ? new Date(
          Date.now() + input.auto_release_days * 24 * 60 * 60 * 1000
        )
      : null

    return await this.createEscrowTransactions(
      {
        ...input,
        status: EscrowStatus.HELD,
        held_amount: input.total_amount,
        released_amount: 0,
        refunded_amount: 0,
        held_at: new Date(),
        auto_release_at: autoReleaseAt,
      },
      sharedContext
    )
  }

  /**
   * Request a payment release (for a milestone or full delivery)
   */
  @InjectTransactionManager()
  async requestRelease(
    input: {
      escrow_transaction_id: string
      amount: number
      trigger: ReleaseTrigger
      milestone_id?: string
      notes?: string
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const escrow = await this.retrieveEscrowTransaction(
      input.escrow_transaction_id,
      {}
    )

    const e = escrow as {
      status: EscrowStatus
      held_amount: number
      released_amount: number
      currency_code: string
    }

    if (
      ![
        EscrowStatus.HELD,
        EscrowStatus.PARTIALLY_RELEASED,
      ].includes(e.status)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Escrow is not in a releasable state"
      )
    }

    const availableAmount =
      Number(e.held_amount) - Number(e.released_amount || 0)

    if (input.amount > availableAmount) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Release amount (${input.amount}) exceeds available escrow (${availableAmount})`
      )
    }

    return await this.createPaymentReleases(
      {
        ...input,
        currency_code: e.currency_code,
        status: ReleaseStatus.PENDING,
      },
      sharedContext
    )
  }

  /**
   * Approve and process a payment release
   */
  @InjectTransactionManager()
  async approveRelease(
    releaseId: string,
    approvedBy: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const release = await this.retrievePaymentRelease(releaseId, {
      relations: ["escrow_transaction"],
    })

    const r = release as { status: ReleaseStatus }
    if (r.status !== ReleaseStatus.PENDING) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Release is not in pending state"
      )
    }

    await this.updatePaymentReleases(
      {
        id: releaseId,
        status: ReleaseStatus.APPROVED,
        approved_by: approvedBy,
        approved_at: new Date(),
      },
      sharedContext
    )

    return release
  }

  /**
   * Mark release as completed (after Stripe transfer)
   */
  @InjectTransactionManager()
  async completeRelease(
    releaseId: string,
    stripeTransferId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const release = await this.retrievePaymentRelease(releaseId, {
      relations: ["escrow_transaction"],
    })

    await this.updatePaymentReleases(
      {
        id: releaseId,
        status: ReleaseStatus.COMPLETED,
        stripe_transfer_id: stripeTransferId,
        processed_at: new Date(),
      },
      sharedContext
    )

    // Update escrow totals
    const rel = release as {
      amount: number
      escrow_transaction_id: string
    }
    const escrow = await this.retrieveEscrowTransaction(
      rel.escrow_transaction_id,
      {}
    )
    const e = escrow as {
      released_amount: number
      held_amount: number
    }

    const newReleasedAmount = Number(e.released_amount || 0) + Number(rel.amount)
    const isFullyReleased = newReleasedAmount >= Number(e.held_amount)

    await this.updateEscrowTransactions(
      {
        id: rel.escrow_transaction_id,
        released_amount: newReleasedAmount,
        status: isFullyReleased
          ? EscrowStatus.RELEASED
          : EscrowStatus.PARTIALLY_RELEASED,
        released_at: isFullyReleased ? new Date() : undefined,
      },
      sharedContext
    )

    return release
  }

  /**
   * Create a dispute case
   */
  @InjectTransactionManager()
  async createDispute(
    input: {
      escrow_transaction_id: string
      order_id: string
      initiated_by: string
      initiator_type: string
      reason: string
      description: string
      evidence_deadline_days?: number
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    // Check for existing active dispute
    const existing = await this.listDisputeCases(
      {
        escrow_transaction_id: input.escrow_transaction_id,
        status: [
          DisputeStatus.CREATED,
          DisputeStatus.EVIDENCE_REQUESTED,
          DisputeStatus.EVIDENCE_SUBMITTED,
          DisputeStatus.UNDER_REVIEW,
        ],
      },
      {}
    )

    if (existing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "An active dispute already exists for this transaction"
      )
    }

    const evidenceDeadline = input.evidence_deadline_days
      ? new Date(
          Date.now() +
            input.evidence_deadline_days * 24 * 60 * 60 * 1000
        )
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Mark escrow as disputed
    await this.updateEscrowTransactions(
      {
        id: input.escrow_transaction_id,
        status: EscrowStatus.DISPUTED,
      },
      sharedContext
    )

    return await this.createDisputeCases(
      {
        ...input,
        status: DisputeStatus.CREATED,
        evidence_deadline: evidenceDeadline,
      },
      sharedContext
    )
  }

  /**
   * Resolve a dispute
   */
  @InjectTransactionManager()
  async resolveDispute(
    disputeId: string,
    input: {
      resolution_type: string
      resolution_amount?: number
      admin_notes?: string
      resolved_by: string
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const dispute = await this.retrieveDisputeCase(disputeId, {})
    const d = dispute as { status: DisputeStatus }

    if (
      ![
        DisputeStatus.EVIDENCE_SUBMITTED,
        DisputeStatus.UNDER_REVIEW,
        DisputeStatus.CREATED,
        DisputeStatus.EVIDENCE_REQUESTED,
      ].includes(d.status)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Dispute cannot be resolved in its current state"
      )
    }

    let status: DisputeStatus
    switch (input.resolution_type) {
      case "buyer":
        status = DisputeStatus.RESOLVED_BUYER
        break
      case "seller":
        status = DisputeStatus.RESOLVED_SELLER
        break
      case "split":
        status = DisputeStatus.RESOLVED_SPLIT
        break
      default:
        status = DisputeStatus.CLOSED
    }

    return await this.updateDisputeCases(
      {
        id: disputeId,
        status,
        resolution_type: input.resolution_type,
        resolution_amount: input.resolution_amount,
        admin_notes: input.admin_notes,
        resolved_by: input.resolved_by,
        resolved_at: new Date(),
      },
      sharedContext
    )
  }

  /**
   * Process auto-releases for overdue escrows
   */
  async processAutoReleases() {
    const now = new Date()
    const overdueEscrows = await this.listEscrowTransactions(
      {
        status: [EscrowStatus.HELD],
      },
      {}
    )

    const toRelease = overdueEscrows.filter(
      (e: { auto_release_at: Date | null }) =>
        e.auto_release_at && new Date(e.auto_release_at) <= now
    )

    const released: string[] = []
    for (const escrow of toRelease) {
      const e = escrow as {
        id: string
        held_amount: number
        released_amount: number
      }
      const availableAmount =
        Number(e.held_amount) - Number(e.released_amount || 0)

      if (availableAmount > 0) {
        await this.createPaymentReleases({
          escrow_transaction_id: e.id,
          amount: availableAmount,
          currency_code: "USD",
          trigger: ReleaseTrigger.AUTO_RELEASE,
          status: ReleaseStatus.APPROVED,
          approved_at: new Date(),
        })
        released.push(e.id)
      }
    }

    return released
  }
}

export default EscrowPaymentModuleService
