import { Context } from "@medusajs/framework/types"
import {
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import {
  ServiceOrder,
  ServiceOrderStatus,
  ServiceMilestone,
  MilestoneStatus,
  CompletionEvidence,
} from "./models"

class ServiceOrderModuleService extends MedusaService({
  ServiceOrder,
  ServiceMilestone,
  CompletionEvidence,
}) {
  /**
   * Start a service order
   */
  @InjectTransactionManager()
  async startServiceOrder(
    orderId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const order = await this.retrieveServiceOrder(orderId, {})
    const o = order as { status: ServiceOrderStatus }

    if (o.status !== ServiceOrderStatus.PENDING_START) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Service order cannot be started in its current state"
      )
    }

    return await this.updateServiceOrders(
      {
        id: orderId,
        status: ServiceOrderStatus.IN_PROGRESS,
        started_at: new Date(),
      },
      sharedContext
    )
  }

  /**
   * Submit a milestone deliverable
   */
  @InjectTransactionManager()
  async submitMilestone(
    milestoneId: string,
    input: {
      deliverable_url?: string
      deliverable_description?: string
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const milestone = await this.retrieveServiceMilestone(milestoneId, {})
    const m = milestone as { status: MilestoneStatus }

    if (
      ![MilestoneStatus.IN_PROGRESS, MilestoneStatus.REVISION_REQUESTED].includes(
        m.status
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Milestone is not in a submittable state"
      )
    }

    return await this.updateServiceMilestones(
      {
        id: milestoneId,
        status: MilestoneStatus.SUBMITTED,
        submitted_at: new Date(),
        ...input,
      },
      sharedContext
    )
  }

  /**
   * Approve a milestone (buyer)
   */
  @InjectTransactionManager()
  async approveMilestone(
    milestoneId: string,
    reviewerNotes?: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const milestone = await this.retrieveServiceMilestone(milestoneId, {
      relations: ["service_order"],
    })
    const m = milestone as { status: MilestoneStatus }

    if (m.status !== MilestoneStatus.SUBMITTED) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only submitted milestones can be approved"
      )
    }

    await this.updateServiceMilestones(
      {
        id: milestoneId,
        status: MilestoneStatus.APPROVED,
        approved_at: new Date(),
        reviewer_notes: reviewerNotes,
      },
      sharedContext
    )

    // Check if all milestones are approved
    const ms = milestone as { service_order_id: string }
    await this.checkOrderCompletion(ms.service_order_id, sharedContext)

    return milestone
  }

  /**
   * Request revision on a milestone
   */
  @InjectTransactionManager()
  async requestMilestoneRevision(
    milestoneId: string,
    reviewerNotes: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const milestone = await this.retrieveServiceMilestone(milestoneId, {
      relations: ["service_order"],
    })
    const m = milestone as { status: MilestoneStatus; service_order_id: string }

    if (m.status !== MilestoneStatus.SUBMITTED) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only submitted milestones can be revised"
      )
    }

    await this.updateServiceMilestones(
      {
        id: milestoneId,
        status: MilestoneStatus.REVISION_REQUESTED,
        reviewer_notes: reviewerNotes,
      },
      sharedContext
    )

    // Increment revision count on order
    const order = await this.retrieveServiceOrder(m.service_order_id, {})
    const o = order as { revision_count: number; max_revisions: number | null }

    if (o.max_revisions && o.revision_count >= o.max_revisions) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Maximum revision count reached"
      )
    }

    await this.updateServiceOrders(
      {
        id: m.service_order_id,
        revision_count: o.revision_count + 1,
        status: ServiceOrderStatus.REVISION_REQUESTED,
      },
      sharedContext
    )

    return milestone
  }

  /**
   * Check if all milestones are approved and complete the order
   */
  @InjectTransactionManager()
  private async checkOrderCompletion(
    serviceOrderId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const milestones = await this.listServiceMilestones(
      { service_order_id: serviceOrderId },
      {}
    )

    const allApproved = milestones.every(
      (m: { status: MilestoneStatus }) => m.status === MilestoneStatus.APPROVED
    )

    if (allApproved && milestones.length > 0) {
      await this.updateServiceOrders(
        {
          id: serviceOrderId,
          status: ServiceOrderStatus.COMPLETED,
          completed_at: new Date(),
        },
        sharedContext
      )
    }
  }

  /**
   * Submit completion for the entire order (non-milestone based)
   */
  @InjectTransactionManager()
  async submitOrderForReview(
    orderId: string,
    sellerNotes?: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const order = await this.retrieveServiceOrder(orderId, {})
    const o = order as { status: ServiceOrderStatus }

    if (o.status !== ServiceOrderStatus.IN_PROGRESS) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order must be in progress to submit for review"
      )
    }

    return await this.updateServiceOrders(
      {
        id: orderId,
        status: ServiceOrderStatus.AWAITING_REVIEW,
        seller_notes: sellerNotes,
      },
      sharedContext
    )
  }

  /**
   * Complete service order (buyer confirms)
   */
  @InjectTransactionManager()
  async completeServiceOrder(
    orderId: string,
    buyerNotes?: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const order = await this.retrieveServiceOrder(orderId, {})
    const o = order as { status: ServiceOrderStatus }

    if (o.status !== ServiceOrderStatus.AWAITING_REVIEW) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order must be awaiting review to complete"
      )
    }

    return await this.updateServiceOrders(
      {
        id: orderId,
        status: ServiceOrderStatus.COMPLETED,
        completed_at: new Date(),
        buyer_notes: buyerNotes,
      },
      sharedContext
    )
  }
}

export default ServiceOrderModuleService
