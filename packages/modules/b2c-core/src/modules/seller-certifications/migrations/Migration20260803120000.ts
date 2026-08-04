import { Migration } from '@medusajs/framework/mikro-orm/migrations'

/**
 * seller-certifications: add multi-doc `documents` column.
 *
 * Sellers previously attached one proof URL per certification. Real
 * cert reviews often need multiple artefacts (the PDF certificate
 * plus a link to the issuing body's public verification registry, or
 * a multi-page scan). Adds `documents jsonb NOT NULL DEFAULT '[]'`
 * and backfills any pre-existing `document_url` into a single-entry
 * array so admin previews for legacy rows don't render blank.
 *
 * `document_url` stays on the table for backwards compat — old
 * clients that read it still work. New attach writes go only into
 * `documents`; reads should prefer `documents` and fall back to
 * `[{url: document_url, kind: 'url'}]` when `documents` is empty.
 */
export class Migration20260803120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "seller_certification" ADD COLUMN IF NOT EXISTS "documents" jsonb NOT NULL DEFAULT '[]'::jsonb;`
    )
    // Backfill: any row with a document_url and an empty documents
    // array gets a single-entry documents. Guarded by jsonb_typeof so
    // we don't overwrite anything that's already populated.
    this.addSql(
      `UPDATE "seller_certification"
         SET "documents" = jsonb_build_array(
           jsonb_build_object(
             'url', "document_url",
             'kind', 'url'
           )
         )
       WHERE "document_url" IS NOT NULL
         AND "document_url" <> ''
         AND ("documents" IS NULL OR jsonb_array_length("documents") = 0);`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "seller_certification" DROP COLUMN IF EXISTS "documents";`
    )
  }

}
