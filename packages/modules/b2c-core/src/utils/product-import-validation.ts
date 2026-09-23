/**
 * B-11 — bulk-upload validation that names the row and the field.
 *
 * Pure: takes the parsed CSV rows, returns the products ready to create
 * (forced to 'proposed' — bulk uploads enter the same D-01 review state
 * as single entries) plus a per-row error report the vendor can act on.
 * Row numbers are 1-based over DATA rows (header excluded), matching
 * what the vendor sees in their spreadsheet minus the header.
 */

import { z } from 'zod'

import { ProductStatus } from '@medusajs/framework/utils'

import { CreateProduct } from '../api/vendor/products/validators'

export type ImportRowError = {
  row: number
  field: string
  message: string
}

const RowSchema = CreateProduct.extend({
  status: z.string().optional(),
})

export type ImportProductRow = Omit<z.infer<typeof RowSchema>, 'status'> & {
  status: ProductStatus
}

export type ImportValidationResult = {
  toCreate: ImportProductRow[]
  errors: ImportRowError[]
}

function hasPositivePrice(product: {
  variants?: Array<{ prices?: Array<{ amount?: number | string }> }> | null
}): boolean {
  for (const variant of product.variants || []) {
    for (const price of variant?.prices || []) {
      const amount = Number(price?.amount)
      if (Number.isFinite(amount) && amount > 0) {
        return true
      }
    }
  }
  return false
}

export function collectImportRows(products: unknown[]): ImportValidationResult {
  const toCreate: ImportValidationResult['toCreate'] = []
  const errors: ImportRowError[] = []

  products.forEach((raw, index) => {
    const row = index + 1
    const parsed = RowSchema.safeParse(raw)

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row,
          field: issue.path.join('.') || '(row)',
          message: issue.message,
        })
      }
      return
    }

    // D-04 coherence: a bulk-uploaded product is a SUBMISSION — it needs
    // a positive price just like a single product submitted for review.
    if (!hasPositivePrice(parsed.data as never)) {
      errors.push({
        row,
        field: 'variants.prices',
        message: 'At least one variant needs a price greater than 0',
      })
      return
    }

    toCreate.push({
      ...parsed.data,
      status: 'proposed' as ProductStatus,
    })
  })

  return { toCreate, errors }
}

/** Wire shape for the dry-run report (errors capped for transport). */
export function toImportReport(
  result: ImportValidationResult,
  errorCap = 50
): {
  valid_count: number
  error_count: number
  errors: ImportRowError[]
  truncated: boolean
} {
  return {
    valid_count: result.toCreate.length,
    error_count: result.errors.length,
    errors: result.errors.slice(0, errorCap),
    truncated: result.errors.length > errorCap,
  }
}
