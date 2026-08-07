import { ExecArgs } from '@medusajs/framework/types'
import {
  ContainerRegistrationKeys,
  Modules
} from '@medusajs/framework/utils'
import { Client } from '@googlemaps/google-maps-services-js'

import {
  STOCK_LOCATION_GEO_MODULE,
  StockLocationGeoModuleService
} from '@mercurjs/b2c-core/modules/stock-location-geo'

/**
 * Backfill script — geocode existing stock_locations without a stock_location_geo row.
 *
 * Context:
 *   The vendor-panel now captures a warehouse map-pin during location create/edit
 *   (see packages/modules/b2c-core/src/api/vendor/stock-locations/*). Every stock
 *   location that pre-dates that change has NO stock_location_geo row. Downstream
 *   distance / delivery-carbon features hide any warehouse without coords. This
 *   script fills the gap by geocoding the existing address_1 + city + country_code.
 *
 * Safety:
 *   • Dry-run by default. Pass --commit to actually create geo rows + links.
 *   • Skips warehouses that already have a stock_location_geo row.
 *   • Skips warehouses with no address at all (nothing to geocode).
 *   • Only writes when both lat and lng resolve to finite numbers.
 *   • Rate-limited to ~18 requests/second (well under Google's 50/sec free tier).
 *
 * Usage (Medusa exec):
 *   npx medusa exec ./src/scripts/backfill-stock-location-geo.ts
 *   npx medusa exec ./src/scripts/backfill-stock-location-geo.ts --commit
 *   npx medusa exec ./src/scripts/backfill-stock-location-geo.ts --commit --limit=50
 *
 * Env:
 *   GOOGLE_MAPS_API_KEY — Google Geocoding API key
 */

const RATE_LIMIT_MS = 55

const parseFlags = (argv: string[]) =>
  argv.reduce(
    (acc, arg) => {
      if (arg === '--commit') acc.commit = true
      else if (arg === '--dry-run') acc.commit = false
      else if (arg.startsWith('--limit=')) acc.limit = parseInt(arg.split('=')[1], 10)
      return acc
    },
    { commit: false, limit: 0 } as { commit: boolean; limit: number }
  )

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const composeAddress = (loc: {
  address?: { address_1?: string | null; city?: string | null; country_code?: string | null } | null
}) => {
  const a = loc.address
  if (!a) return ''
  return [a.address_1, a.city, a.country_code].filter(Boolean).join(', ').trim()
}

export default async function backfillStockLocationGeo({ container, args }: ExecArgs) {
  const flags = parseFlags(args || [])
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info(
    `[backfill-stock-location-geo] mode=${flags.commit ? 'COMMIT' : 'dry-run'} limit=${flags.limit || 'all'}`
  )

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    logger.error('GOOGLE_MAPS_API_KEY not set. Aborting.')
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const geoService: StockLocationGeoModuleService = container.resolve(
    STOCK_LOCATION_GEO_MODULE
  )

  // Load all stock_locations WITH their geo (if any) via graph
  const { data: locations } = await query.graph({
    entity: 'stock_location',
    fields: [
      'id',
      'name',
      'address.address_1',
      'address.city',
      'address.country_code',
      'stock_location_geo.id',
      'stock_location_geo.latitude',
      'stock_location_geo.longitude'
    ]
  })

  const rows = flags.limit > 0 ? locations.slice(0, flags.limit) : locations
  logger.info(`[backfill-stock-location-geo] scanning ${rows.length} stock locations`)

  const googleClient = new Client({})

  let scanned = 0
  let skippedHasGeo = 0
  let skippedNoAddress = 0
  let geocoded = 0
  let geocodeFailed = 0
  let created = 0

  for (const loc of rows) {
    scanned++
    if (
      loc.stock_location_geo &&
      Number.isFinite(loc.stock_location_geo.latitude) &&
      Number.isFinite(loc.stock_location_geo.longitude)
    ) {
      skippedHasGeo++
      continue
    }

    const address = composeAddress(loc)
    if (!address) {
      skippedNoAddress++
      continue
    }

    let lat: number | null = null
    let lng: number | null = null
    try {
      const resp = await googleClient.geocode({
        params: { address, key: apiKey },
        timeout: 8000
      })
      const first = resp.data.results && resp.data.results[0]
      if (first && first.geometry && first.geometry.location) {
        lat = first.geometry.location.lat
        lng = first.geometry.location.lng
      }
    } catch (err) {
      logger.warn(
        `[backfill-stock-location-geo] geocode failed for ${loc.id} (${address}): ${(err as Error).message}`
      )
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      geocodeFailed++
      await sleep(RATE_LIMIT_MS)
      continue
    }
    geocoded++

    logger.info(
      `[backfill-stock-location-geo] ${loc.id} | ${address} → ${lat!.toFixed(5)}, ${lng!.toFixed(5)}`
    )

    if (flags.commit) {
      const [geoRecord] = await geoService.createStockLocationGeoes([
        {
          stock_location_id: loc.id,
          latitude: lat!,
          longitude: lng!,
          location_precision: 'geocoded'
        }
      ])
      await remoteLink.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
        [STOCK_LOCATION_GEO_MODULE]: { stock_location_geo_id: geoRecord.id }
      })
      created++
    }

    await sleep(RATE_LIMIT_MS)
  }

  logger.info('[backfill-stock-location-geo] summary:')
  logger.info(`  scanned:            ${scanned}`)
  logger.info(`  skipped (has geo):  ${skippedHasGeo}`)
  logger.info(`  skipped (no addr):  ${skippedNoAddress}`)
  logger.info(`  geocode succeeded:  ${geocoded}`)
  logger.info(`  geocode failed:     ${geocodeFailed}`)
  logger.info(`  created + linked:   ${created} (mode=${flags.commit ? 'COMMIT' : 'dry-run'})`)
}
