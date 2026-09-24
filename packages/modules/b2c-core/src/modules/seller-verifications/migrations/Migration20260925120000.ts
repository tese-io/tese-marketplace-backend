import { Migration } from '@medusajs/framework/mikro-orm/migrations'

/**
 * seller-verifications: business verification (KYB) records — B-23/B-25.
 */
export class Migration20260925120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "seller_verification" ("id" text not null, "seller_id" text not null, "document_key" text not null, "document_url" text not null, "document_filename" text null, "document_kind" text check ("document_kind" in ('certificate_of_incorporation', 'registration_extract', 'trade_licence', 'tax_registration')) not null, "legal_name" text not null, "registration_number" text not null, "country_of_registration" text not null, "ocr_prefill" jsonb null, "status" text check ("status" in ('pending', 'verified', 'rejected', 'archived')) not null, "verification_method" text check ("verification_method" in ('document_only', 'registry_checked')) null, "reviewed_by" text null, "reviewed_at" timestamptz null, "reviewer_note" text null, "duplicate_signals" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_verification_pkey" primary key ("id"));`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_verification_seller_id" ON "seller_verification" ("seller_id") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_verification_status_created_at" ON "seller_verification" ("status", "created_at") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_verification_deleted_at" ON "seller_verification" ("deleted_at") WHERE "deleted_at" IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seller_verification" cascade;`)
  }

}
