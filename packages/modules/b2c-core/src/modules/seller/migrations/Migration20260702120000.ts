import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260702120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller" add column if not exists "is_verified" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seller" drop column if exists "is_verified";`);
  }

}
