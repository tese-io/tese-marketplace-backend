import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260702150000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller" add column if not exists "website" text null;`);
    this.addSql(`alter table if exists "seller" add column if not exists "company_type" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seller" drop column if exists "website";`);
    this.addSql(`alter table if exists "seller" drop column if exists "company_type";`);
  }

}
