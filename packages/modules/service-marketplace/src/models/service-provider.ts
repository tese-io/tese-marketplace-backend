import { model } from "@medusajs/framework/utils"

export enum VerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export const ServiceProvider = model.define("service_provider", {
  id: model.id({ prefix: "sprov" }).primaryKey(),
  seller_id: model.text().unique(),
  company_name: model.text().searchable(),
  bio: model.text().nullable(),
  expertise_areas: model.json().nullable(),
  certifications: model.json().nullable(),
  verification_status: model
    .enum(VerificationStatus)
    .default(VerificationStatus.PENDING),
  years_of_experience: model.number().nullable(),
  team_size: model.number().nullable(),
  portfolio_url: model.text().nullable(),
  linkedin_url: model.text().nullable(),
  languages: model.json().nullable(),
  industries_served: model.json().nullable(),
  completed_projects: model.number().default(0),
  avg_rating: model.number().nullable(),
  response_time_hours: model.number().nullable(),
  logo: model.text().nullable(),
  banner: model.text().nullable(),
  metadata: model.json().nullable(),
})
