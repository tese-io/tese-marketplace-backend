import { Migration } from '@medusajs/framework/mikro-orm/migrations'

/**
 * seller-verifications: B-26 merge record (attach-to-existing-store).
 */
export class Migration20260926120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "seller_verification" ADD COLUMN IF NOT EXISTS "merge_record" jsonb NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "seller_verification" DROP COLUMN IF EXISTS "merge_record";`)
  }

}
