import { Context } from "@medusajs/framework/types"
import {
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"

import {
  Service,
  ServiceStatus,
  ServiceTier,
  ServiceDeliverable,
  ServiceCategory,
  ServiceProvider,
} from "./models"

class ServiceMarketplaceModuleService extends MedusaService({
  Service,
  ServiceTier,
  ServiceDeliverable,
  ServiceCategory,
  ServiceProvider,
}) {
  /**
   * Publish a service (transition from draft/pending to active)
   */
  @InjectTransactionManager()
  async publishService(
    serviceId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const service = await this.retrieveService(serviceId, {
      relations: ["tiers"],
    })

    const s = service as { status: ServiceStatus; tiers: unknown[] }

    if (s.status === ServiceStatus.ACTIVE) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Service is already active"
      )
    }

    // Validate: must have at least one tier or custom quote enabled
    const svc = service as { is_custom_quote_enabled: boolean }
    if (!s.tiers?.length && !svc.is_custom_quote_enabled) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Service must have at least one pricing tier or enable custom quotes"
      )
    }

    return await this.updateServices(
      { id: serviceId, status: ServiceStatus.PENDING_APPROVAL },
      sharedContext
    )
  }

  /**
   * Admin approves a service
   */
  @InjectTransactionManager()
  async approveService(
    serviceId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const service = await this.retrieveService(serviceId, {})
    const s = service as { status: ServiceStatus }

    if (s.status !== ServiceStatus.PENDING_APPROVAL) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only pending services can be approved"
      )
    }

    return await this.updateServices(
      { id: serviceId, status: ServiceStatus.ACTIVE },
      sharedContext
    )
  }

  /**
   * Admin rejects a service
   */
  @InjectTransactionManager()
  async rejectService(
    serviceId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const service = await this.retrieveService(serviceId, {})
    const s = service as { status: ServiceStatus }

    if (s.status !== ServiceStatus.PENDING_APPROVAL) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only pending services can be rejected"
      )
    }

    return await this.updateServices(
      { id: serviceId, status: ServiceStatus.DRAFT },
      sharedContext
    )
  }

  /**
   * Archive a service
   */
  @InjectTransactionManager()
  async archiveService(
    serviceId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.updateServices(
      { id: serviceId, status: ServiceStatus.ARCHIVED },
      sharedContext
    )
  }

  /**
   * Verify a service provider's credentials
   */
  @InjectTransactionManager()
  async verifyProvider(
    providerId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.updateServiceProviders(
      { id: providerId, verification_status: "verified" },
      sharedContext
    )
  }

  /**
   * Increment order count and recalculate rating
   */
  @InjectTransactionManager()
  async recordServiceCompletion(
    serviceId: string,
    rating: number,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const service = await this.retrieveService(serviceId, {})
    const s = service as {
      order_count: number
      review_count: number
      rating: number | null
    }

    const newReviewCount = s.review_count + 1
    const currentAvg = s.rating || 0
    const newAvg =
      (currentAvg * s.review_count + rating) / newReviewCount

    return await this.updateServices(
      {
        id: serviceId,
        order_count: s.order_count + 1,
        review_count: newReviewCount,
        rating: Math.round(newAvg * 10) / 10,
      },
      sharedContext
    )
  }
}

export default ServiceMarketplaceModuleService
