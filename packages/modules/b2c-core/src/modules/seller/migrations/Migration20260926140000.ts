import { Migration } from '@medusajs/framework/mikro-orm/migrations'

/**
 * seller: add the `metadata` jsonb the code has been writing to since the
 * B-01 claim flow (tese_tenant_id, previous_handle) — the column never
 * existed, so those writes were dropped. B-26 stamps merged_from_seller_ids.
 */
export class Migration20260926140000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "seller" ADD COLUMN IF NOT EXISTS "metadata" jsonb NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "seller" DROP COLUMN IF EXISTS "metadata";`)
  }

}
