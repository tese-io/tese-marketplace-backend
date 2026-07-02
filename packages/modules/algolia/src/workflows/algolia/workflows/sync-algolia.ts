import { WorkflowResponse, createWorkflow } from '@medusajs/workflows-sdk'

import { configureAlgoliaSettingsStep, syncAlgoliaProductsStep } from '../steps'

export const syncAlgoliaWorkflow = createWorkflow(
  'sync-algolia-workflow',
  function () {
    configureAlgoliaSettingsStep()
    return new WorkflowResponse(syncAlgoliaProductsStep())
  }
)
