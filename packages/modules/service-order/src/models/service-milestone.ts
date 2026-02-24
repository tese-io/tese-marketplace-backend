import { model } from "@medusajs/framework/utils"
import { ServiceOrder } from "./service-order"

export enum MilestoneStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REVISION_REQUESTED = "revision_requested",
  REJECTED = "rejected",
}

export const ServiceMilestone = model.define("service_milestone", {
  id: model.id({ prefix: "smil" }).primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  sort_order: model.number().default(0),
  status: model.enum(MilestoneStatus).default(MilestoneStatus.PENDING),
  payment_percentage: model.number().nullable(),
  payment_amount: model.bigNumber().nullable(),
  currency_code: model.text().default("USD"),
  due_date: model.dateTime().nullable(),
  started_at: model.dateTime().nullable(),
  submitted_at: model.dateTime().nullable(),
  approved_at: model.dateTime().nullable(),
  deliverable_url: model.text().nullable(),
  deliverable_description: model.text().nullable(),
  reviewer_notes: model.text().nullable(),
  metadata: model.json().nullable(),
  service_order: model.belongsTo(() => ServiceOrder, {
    mappedBy: "milestones",
  }),
})
