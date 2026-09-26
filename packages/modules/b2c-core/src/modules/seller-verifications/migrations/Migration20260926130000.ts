import { Migration } from '@medusajs/framework/mikro-orm/migrations'

/**
 * seller-verifications: B-29 retention — the document can be deleted while
 * the decision record stays, so the document columns become nullable and
 * the purge is timestamped.
 */
export class Migration20260926130000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "seller_verification" ALTER COLUMN "document_key" DROP NOT NULL;`)
    this.addSql(`ALTER TABLE "seller_verification" ALTER COLUMN "document_url" DROP NOT NULL;`)
    this.addSql(`ALTER TABLE "seller_verification" ADD COLUMN IF NOT EXISTS "document_purged_at" timestamptz NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "seller_verification" DROP COLUMN IF EXISTS "document_purged_at";`)
    this.addSql(`UPDATE "seller_verification" SET "document_key" = '' WHERE "document_key" IS NULL;`)
    this.addSql(`UPDATE "seller_verification" SET "document_url" = '' WHERE "document_url" IS NULL;`)
    this.addSql(`ALTER TABLE "seller_verification" ALTER COLUMN "document_key" SET NOT NULL;`)
    this.addSql(`ALTER TABLE "seller_verification" ALTER COLUMN "document_url" SET NOT NULL;`)
  }

}
