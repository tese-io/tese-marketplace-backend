import { Context } from "@medusajs/framework/types"
import {
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import {
  NegotiationThread,
  ThreadStatus,
  NegotiationMessage,
  MessageType,
  FileAttachment,
  NegotiationAuditLog,
} from "./models"

class NegotiationModuleService extends MedusaService({
  NegotiationThread,
  NegotiationMessage,
  FileAttachment,
  NegotiationAuditLog,
}) {
  /**
   * Create a new negotiation thread for an RFQ
   */
  @InjectTransactionManager()
  async createNegotiationForRfq(
    input: {
      rfq_request_id: string
      quotation_version_id?: string
      buyer_id: string
      seller_id: string
      talkjs_conversation_id?: string
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    // Check if thread already exists for this RFQ + seller
    const existing = await this.listNegotiationThreads(
      {
        rfq_request_id: input.rfq_request_id,
        seller_id: input.seller_id,
        status: [
          ThreadStatus.ACTIVE,
          ThreadStatus.AWAITING_BUYER,
          ThreadStatus.AWAITING_SELLER,
          ThreadStatus.ON_HOLD,
        ],
      },
      {}
    )

    if (existing.length > 0) {
      return existing[0]
    }

    const thread = await this.createNegotiationThreads(
      {
        ...input,
        status: ThreadStatus.ACTIVE,
        last_activity_at: new Date(),
      },
      sharedContext
    )

    // Log thread creation
    await this.createNegotiationAuditLogs(
      {
        thread_id: (thread as { id: string }).id,
        action: "thread_created",
        actor_id: input.buyer_id,
        actor_type: "customer",
        new_value: { rfq_request_id: input.rfq_request_id },
      },
      sharedContext
    )

    return thread
  }

  /**
   * Send a message in a negotiation thread
   */
  @InjectTransactionManager()
  async sendMessage(
    input: {
      thread_id: string
      sender_id: string
      sender_type: string
      content: string
      type?: MessageType
      quotation_version_id?: string
      proposal_data?: Record<string, unknown>
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const thread = await this.retrieveNegotiationThread(input.thread_id, {})
    const t = thread as { status: ThreadStatus }

    if (
      [
        ThreadStatus.CLOSED_ACCEPTED,
        ThreadStatus.CLOSED_REJECTED,
        ThreadStatus.CLOSED_EXPIRED,
      ].includes(t.status)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot send messages to a closed negotiation"
      )
    }

    const message = await this.createNegotiationMessages(
      {
        ...input,
        type: input.type || MessageType.TEXT,
        thread_id: input.thread_id,
      },
      sharedContext
    )

    // Update thread activity and status
    const newStatus =
      input.sender_type === "customer"
        ? ThreadStatus.AWAITING_SELLER
        : ThreadStatus.AWAITING_BUYER

    const updateData: Record<string, unknown> = {
      id: input.thread_id,
      last_activity_at: new Date(),
      status: newStatus,
    }

    if (
      input.type === MessageType.PROPOSAL ||
      input.type === MessageType.COUNTER_PROPOSAL
    ) {
      const th = thread as { proposal_count: number }
      updateData.proposal_count = th.proposal_count + 1
    }

    await this.updateNegotiationThreads(updateData, sharedContext)

    return message
  }

  /**
   * Close a negotiation thread
   */
  @InjectTransactionManager()
  async closeThread(
    threadId: string,
    reason: "accepted" | "rejected" | "expired",
    actorId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const statusMap = {
      accepted: ThreadStatus.CLOSED_ACCEPTED,
      rejected: ThreadStatus.CLOSED_REJECTED,
      expired: ThreadStatus.CLOSED_EXPIRED,
    }

    await this.updateNegotiationThreads(
      {
        id: threadId,
        status: statusMap[reason],
        closed_at: new Date(),
        closed_reason: reason,
      },
      sharedContext
    )

    await this.createNegotiationAuditLogs(
      {
        thread_id: threadId,
        action: `thread_closed_${reason}`,
        actor_id: actorId,
        actor_type: "system",
      },
      sharedContext
    )
  }

  /**
   * Mark messages as read
   */
  @InjectTransactionManager()
  async markMessagesAsRead(
    threadId: string,
    readerId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const unreadMessages = await this.listNegotiationMessages(
      {
        thread_id: threadId,
        is_read: false,
      },
      {}
    )

    const toMark = unreadMessages.filter(
      (m: { sender_id: string }) => m.sender_id !== readerId
    )

    for (const msg of toMark) {
      await this.updateNegotiationMessages(
        {
          id: (msg as { id: string }).id,
          is_read: true,
          read_at: new Date(),
        },
        sharedContext
      )
    }

    return toMark.length
  }

  /**
   * Get stale negotiations (no activity for X hours)
   */
  async getStaleNegotiations(inactiveHours: number = 72) {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - inactiveHours)

    const threads = await this.listNegotiationThreads(
      {
        status: [
          ThreadStatus.ACTIVE,
          ThreadStatus.AWAITING_BUYER,
          ThreadStatus.AWAITING_SELLER,
        ],
      },
      {}
    )

    return threads.filter((t: { last_activity_at: Date | null }) => {
      if (!t.last_activity_at) return true
      return new Date(t.last_activity_at) < cutoff
    })
  }
}

export default NegotiationModuleService
