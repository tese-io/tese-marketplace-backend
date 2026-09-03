import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow
} from '@medusajs/medusa/core-flows'

/**
 * Adds the India and Africa markets.
 *
 * A market has to exist in Medusa before the storefront can serve a locale for
 * it — `/hi-in` is unreachable until an India region does. Africa is grouped
 * into trade blocs rather than one region per country because pricing and
 * fulfilment are set per region, and per-country regions would mean maintaining
 * fifty price lists.
 *
 * Cross-border African B2B is quoted in USD, so that is the regional currency;
 * India trades domestically in INR.
 *
 * Idempotent: regions that already exist are skipped, so this is safe to re-run.
 */
const REGIONS: { name: string; currency_code: string; countries: string[] }[] = [
  { name: 'India', currency_code: 'inr', countries: ['in'] },
  {
    name: 'North Africa',
    currency_code: 'usd',
    countries: ['ma', 'dz', 'tn', 'ly', 'eg']
  },
  {
    name: 'West Africa',
    currency_code: 'usd',
    countries: ['ng', 'gh', 'sn', 'ci', 'cm', 'ml', 'bf', 'ne', 'bj', 'tg', 'gn']
  },
  {
    name: 'East Africa',
    currency_code: 'usd',
    countries: ['ke', 'tz', 'ug', 'rw', 'bi', 'et']
  },
  {
    name: 'Southern Africa',
    currency_code: 'usd',
    countries: ['za', 'ao', 'mz', 'na', 'bw', 'zm', 'zw']
  }
]

export default async function addGrowthRegions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const regionModule = container.resolve(Modules.REGION)

  const existing = await regionModule.listRegions({})
  const existingNames = new Set(existing.map((region) => region.name))

  const toCreate = REGIONS.filter((region) => !existingNames.has(region.name))

  if (!toCreate.length) {
    logger.info('All growth regions already exist — nothing to do.')
    return
  }

  logger.info(`Creating regions: ${toCreate.map((r) => r.name).join(', ')}`)

  await createRegionsWorkflow(container).run({
    input: {
      regions: toCreate.map((region) => ({
        name: region.name,
        currency_code: region.currency_code,
        countries: region.countries,
        payment_providers: ['pp_system_default']
      }))
    }
  })

  // Tax regions are required per country before an order can be totalled.
  const countries = toCreate.flatMap((region) => region.countries)

  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({ country_code }))
  })

  logger.info(`Done. ${toCreate.length} regions, ${countries.length} countries.`)
}
