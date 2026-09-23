import { parseProductCsvStep } from "@medusajs/medusa/core-flows";
import {
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/workflows-sdk";

import { collectProductsToImportStep } from "../steps";

/**
 * B-11 dry run — parse + validate the CSV and return the full
 * {toCreate, errors} result WITHOUT creating anything. The panel shows
 * this as the validation report the vendor confirms before committing.
 */
export const validateSellerProductsImportWorkflow = createWorkflow(
  "validate-seller-products-import",
  function (input: { file_content: string }) {
    const products = parseProductCsvStep(input.file_content);
    const result = collectProductsToImportStep(products);
    return new WorkflowResponse(result);
  }
);
