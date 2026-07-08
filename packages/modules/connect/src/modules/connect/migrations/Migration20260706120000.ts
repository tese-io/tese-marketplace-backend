import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260706120000 extends Migration {
  async up (): Promise<void> {
    this.addSql(`
      create table if not exists "connector_oauth_state" (
        "state" text not null,
        "seller_id" text not null,
        "shop" text not null,
        "expires_at" timestamptz not null,
        "created_at" timestamptz not null default now(),
        constraint "connector_oauth_state_pkey" primary key ("state")
      );
    `)
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_connector_oauth_state_expires_at" ON "connector_oauth_state" (expires_at);'
    )
  }

  async down (): Promise<void> {
    this.addSql('drop table if exists "connector_oauth_state" cascade;')
  }
}
