import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260723120100 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "seller_certification" ("id" text not null, "seller_id" text not null, "certification_slug" text not null, "document_url" text null, "verification_status" text check ("verification_status" in ('pending', 'verified', 'rejected', 'expired')) not null, "verified_by" text null, "verified_at" timestamptz null, "verification_notes" text null, "expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_certification_pkey" primary key ("id"));`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_certification_seller_id" ON "seller_certification" ("seller_id") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_certification_seller_slug_unique" ON "seller_certification" ("seller_id", "certification_slug") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_certification_status_created_at" ON "seller_certification" ("verification_status", "created_at") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_certification_status_expires_at" ON "seller_certification" ("verification_status", "expires_at") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_certification_deleted_at" ON "seller_certification" ("deleted_at") WHERE "deleted_at" IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seller_certification" cascade;`)
  }

}
