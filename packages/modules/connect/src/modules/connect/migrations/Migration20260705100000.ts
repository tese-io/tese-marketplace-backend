import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260705100000 extends Migration {
  async up (): Promise<void> {
    this.addSql(
      'create table if not exists "connector_provider" ("id" text not null, "provider" text not null, "name" text not null, "description" text null, "enabled" boolean not null default false, "config" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "connector_provider_pkey" primary key ("id"));'
    )
    this.addSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_connector_provider_provider" ON "connector_provider" (provider) WHERE deleted_at IS NULL;'
    )
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_connector_provider_deleted_at" ON "connector_provider" (deleted_at) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'create table if not exists "connector_installation" ("id" text not null, "seller_id" text not null, "provider" text not null, "status" text check ("status" in (\'pending\', \'connected\', \'disconnected\', \'error\')) not null default \'pending\', "external_store_id" text null, "external_store_url" text null, "sync_config" jsonb null, "last_sync_at" timestamptz null, "last_sync_status" text null, "error_message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "connector_installation_pkey" primary key ("id"));'
    )
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_connector_installation_seller_id" ON "connector_installation" (seller_id) WHERE deleted_at IS NULL;'
    )
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_connector_installation_provider" ON "connector_installation" (provider) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'create table if not exists "connector_credential" ("id" text not null, "installation_id" text not null, "credential_type" text not null, "encrypted_data" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "connector_credential_pkey" primary key ("id"));'
    )
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_connector_credential_installation_id" ON "connector_credential" (installation_id) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'create table if not exists "external_entity_map" ("id" text not null, "installation_id" text not null, "external_type" text not null, "external_id" text not null, "medusa_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "external_entity_map_pkey" primary key ("id"));'
    )
    this.addSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_external_entity_map_unique" ON "external_entity_map" (installation_id, external_type, external_id) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'create table if not exists "category_mapping" ("id" text not null, "installation_id" text not null, "external_category_id" text not null, "external_category_path" text null, "medusa_category_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "category_mapping_pkey" primary key ("id"));'
    )
    this.addSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_category_mapping_unique" ON "category_mapping" (installation_id, external_category_id) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'create table if not exists "sync_run" ("id" text not null, "installation_id" text not null, "direction" text check ("direction" in (\'inbound\', \'outbound\')) not null default \'inbound\', "status" text check ("status" in (\'pending\', \'running\', \'completed\', \'failed\')) not null default \'pending\', "started_at" timestamptz null, "completed_at" timestamptz null, "stats" jsonb null, "error_message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sync_run_pkey" primary key ("id"));'
    )
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_sync_run_installation_id" ON "sync_run" (installation_id) WHERE deleted_at IS NULL;'
    )

    this.addSql(
      'create table if not exists "sync_log" ("id" text not null, "sync_run_id" text not null, "level" text check ("level" in (\'info\', \'warn\', \'error\')) not null default \'info\', "message" text not null, "context" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sync_log_pkey" primary key ("id"));'
    )
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_sync_log_sync_run_id" ON "sync_log" (sync_run_id) WHERE deleted_at IS NULL;'
    )

    this.addSql(`
      INSERT INTO connector_provider (id, provider, name, description, enabled, created_at, updated_at)
      SELECT 'cnp_csv', 'csv', 'Product Importer', 'Bulk import products via CSV files', true, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM connector_provider WHERE provider = 'csv' AND deleted_at IS NULL);
    `)
    this.addSql(`
      INSERT INTO connector_provider (id, provider, name, description, enabled, created_at, updated_at)
      SELECT 'cnp_shopify', 'shopify', 'Shopify Connector', 'Sync products, inventory, and pricing from Shopify', false, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM connector_provider WHERE provider = 'shopify' AND deleted_at IS NULL);
    `)
    this.addSql(`
      INSERT INTO connector_provider (id, provider, name, description, enabled, created_at, updated_at)
      SELECT 'cnp_magento', 'magento', 'Magento Connector', 'Sync products and inventory from Adobe Commerce / Magento', false, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM connector_provider WHERE provider = 'magento' AND deleted_at IS NULL);
    `)
    this.addSql(`
      INSERT INTO connector_provider (id, provider, name, description, enabled, created_at, updated_at)
      SELECT 'cnp_custom_api', 'custom_api', 'Custom API Connector', 'Connect any REST API with configurable field mapping', false, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM connector_provider WHERE provider = 'custom_api' AND deleted_at IS NULL);
    `)
  }

  async down (): Promise<void> {
    this.addSql('drop table if exists "sync_log" cascade;')
    this.addSql('drop table if exists "sync_run" cascade;')
    this.addSql('drop table if exists "category_mapping" cascade;')
    this.addSql('drop table if exists "external_entity_map" cascade;')
    this.addSql('drop table if exists "connector_credential" cascade;')
    this.addSql('drop table if exists "connector_installation" cascade;')
    this.addSql('drop table if exists "connector_provider" cascade;')
  }
}
