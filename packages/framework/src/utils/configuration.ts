import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { ConfigurationRuleType } from "../types";

export const ConfigurationRuleDefaults = new Map<
  ConfigurationRuleType,
  boolean
>([
  [ConfigurationRuleType.GLOBAL_PRODUCT_CATALOG, false],
  [ConfigurationRuleType.PRODUCT_REQUEST_ENABLED, true],
  // D-01 (Kuzi, DECIDED): review-before-visible is the launch state —
  // a vendor submits, an admin approves, only then is the product
  // buyer-visible. Direct publish is the flag-flip (a configuration_rule
  // row set is_enabled=false), defaulted OFF.
  [ConfigurationRuleType.REQUIRE_PRODUCT_APPROVAL, true],
  [ConfigurationRuleType.PRODUCT_IMPORT_ENABLED, true],
]);

export const checkConfigurationRule = async (
  scope: MedusaContainer,
  ruleType: ConfigurationRuleType
): Promise<boolean> => {
  const logger = scope.resolve(ContainerRegistrationKeys.LOGGER);
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);

  let enabled = ConfigurationRuleDefaults.get(ruleType) || false;

  try {
    const {
      data: [rule],
    } = await query.graph({
      entity: "configuration_rule",
      fields: ["is_enabled"],
      filters: {
        rule_type: ruleType,
      },
    });

    // No DB row = use the code default silently. This used to throw on
    // `rule.is_enabled` and log an ERROR on every call in fresh envs —
    // now on the hot path of every product submission (D-04/D-01).
    if (rule && typeof rule.is_enabled === "boolean") {
      enabled = rule.is_enabled;
    }
  } catch (error) {
    logger.error(`Error checking configuration rule ${ruleType}: ${error}`);
  }

  return enabled;
};
