import { Migration } from '@medusajs/framework/mikro-orm/migrations'

export class Migration20260723120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "stock_location_geo" ("id" text not null, "stock_location_id" text not null, "latitude" real not null, "longitude" real not null, "location_precision" text check ("location_precision" in ('map_pinned', 'geocoded', 'country_centroid')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_location_geo_pkey" primary key ("id"));`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_location_geo_stock_location_id_unique" ON "stock_location_geo" ("stock_location_id") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_location_geo_lat_lng" ON "stock_location_geo" ("latitude", "longitude") WHERE "deleted_at" IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_location_geo_deleted_at" ON "stock_location_geo" ("deleted_at") WHERE "deleted_at" IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_location_geo" cascade;`)
  }

}
