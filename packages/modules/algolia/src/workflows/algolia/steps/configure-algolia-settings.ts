import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";

import { IndexType } from "@mercurjs/framework";

import {
  ALGOLIA_MODULE,
  AlgoliaModuleService,
  defaultProductSettings,
  defaultReviewSettings,
} from "../../../modules/algolia";

export const configureAlgoliaSettingsStep = createStep(
  "configure-algolia-settings",
  async (_: void, { container }) => {
    const algolia = container.resolve<AlgoliaModuleService>(ALGOLIA_MODULE);

    await algolia.updateSettings(IndexType.PRODUCT, defaultProductSettings);
    await algolia.updateSettings(IndexType.REVIEW, defaultReviewSettings);

    return new StepResponse();
  }
);
