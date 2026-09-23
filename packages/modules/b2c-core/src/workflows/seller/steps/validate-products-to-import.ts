import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import {
  collectImportRows,
  toImportReport,
} from '../../../utils/product-import-validation'

/**
 * B-11: per-row validation with a row+field error report. The real
 * import fails atomically (no partial imports) with a structured
 * message; the dry-run workflow uses `collectProductsToImportStep`
 * below to RETURN the report instead of throwing.
 */
export const validateProductsToImportStep = createStep(
  'validate-products-to-import',
  async (products: unknown[]) => {
    const result = collectImportRows(products)

    if (result.errors.length > 0) {
      const report = toImportReport(result)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Import rejected: ${report.error_count} row error(s), e.g. row ${report.errors[0].row} · ${report.errors[0].field}: ${report.errors[0].message} (IMPORT_VALIDATION:${JSON.stringify(report)})`
      )
    }

    return new StepResponse(result.toCreate)
  }
)

/** Dry-run flavour: never throws — returns {toCreate, errors} whole. */
export const collectProductsToImportStep = createStep(
  'collect-products-to-import',
  async (products: unknown[]) => {
    return new StepResponse(collectImportRows(products))
  }
)
