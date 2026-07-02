import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  createAttributePossibleValuesWorkflow,
  createAttributeValueWorkflow,
  createAttributesWorkflow
} from '@mercurjs/b2c-core/workflows'
import { AttributeUIComponent } from '@mercurjs/framework'

/**
 * P1.3 — promote certifications from free-text product.metadata.certifications
 * to a structured, filterable "Certifications" attribute (attribute module).
 *
 * Idempotent: safe to re-run. Creates the attribute if missing, extends its
 * possible_values with any new canonical values found in product metadata,
 * and links each product to the attribute values parsed from its metadata
 * (skipping values a product already has).
 *
 * Run: npx medusa exec ./src/scripts/setup-certifications-attribute.ts
 */

const ATTRIBUTE_HANDLE = 'certifications'

// Curated controlled vocabulary — extend as the catalog grows.
const CURATED_CERTIFICATIONS = [
  'ISO 9001',
  'ISO 14001',
  'ISO 45001',
  'ISO 50001',
  'EN 10204 3.1',
  'EN 197-1',
  'BS EN 1978',
  'PED 2014/68/EU',
  'REACH',
  'RoHS',
  'CE',
  'GRS',
  'RCS',
  'FSC',
  'FSC Recycled',
  'PEFC',
  'OEKO-TEX',
  'GOTS',
  'Cradle to Cradle',
  'EU Ecolabel',
  'EPD',
  'EuCertPlast',
  'EFSA',
  'FDA',
  'ASI Performance Standard',
  'LME Grade A',
  'IEC 60904',
  'IEC 61215',
  'UL 1741'
]

// Normalisation for common free-text variants (lowercased key → canonical).
const CANONICAL_ALIASES: Record<string, string> = {
  iso9001: 'ISO 9001',
  'iso 9001': 'ISO 9001',
  iso14001: 'ISO 14001',
  'iso 14001': 'ISO 14001',
  'fsc recycled': 'FSC Recycled',
  'oeko-tex': 'OEKO-TEX',
  oekotex: 'OEKO-TEX',
  'cradle-to-cradle': 'Cradle to Cradle',
  c2c: 'Cradle to Cradle',
  'eu-ecolabel': 'EU Ecolabel'
}

function parseCertifications(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

function canonicalise(value: string): string {
  return CANONICAL_ALIASES[value.toLowerCase()] || value
}

export default async function setupCertificationsAttribute({
  container
}: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // 1. Collect certification values from product metadata
  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      'id',
      'title',
      'metadata',
      'attribute_values.value',
      'attribute_values.attribute.handle'
    ],
    filters: { status: 'published' }
  })

  const productCerts = new Map<string, string[]>()
  const allValues = new Set<string>()

  for (const product of products) {
    const certs = parseCertifications(product.metadata?.certifications).map(
      canonicalise
    )
    if (certs.length) {
      productCerts.set(product.id, certs)
      certs.forEach((c) => allValues.add(c))
    }
  }

  logger.info(
    `Certifications backfill: ${productCerts.size}/${products.length} published products carry certification metadata (${allValues.size} distinct values)`
  )

  // 2. Find-or-create the attribute
  const {
    data: [existing]
  } = await query.graph({
    entity: 'attribute',
    fields: ['id', 'possible_values.value'],
    filters: { handle: ATTRIBUTE_HANDLE }
  })

  const vocabulary = Array.from(
    new Set([...CURATED_CERTIFICATIONS, ...allValues])
  ).sort((a, b) => a.localeCompare(b))

  let attributeId: string

  if (!existing) {
    const { result } = await createAttributesWorkflow(container).run({
      input: {
        attributes: [
          {
            name: 'Certifications',
            handle: ATTRIBUTE_HANDLE,
            description:
              'Certifications and standards this product complies with (controlled vocabulary).',
            is_filterable: true,
            ui_component: AttributeUIComponent.MULTIVALUE,
            possible_values: vocabulary.map((value, rank) => ({ value, rank }))
          }
        ]
      }
    })
    attributeId = result[0].id
    logger.info(
      `Created "Certifications" attribute ${attributeId} with ${vocabulary.length} possible values`
    )
  } else {
    attributeId = existing.id
    const existingValues = new Set(
      (existing.possible_values || [])
        .filter(Boolean)
        .map((pv: { value: string }) => pv.value)
    )
    const missing = vocabulary.filter((v) => !existingValues.has(v))
    if (missing.length) {
      await createAttributePossibleValuesWorkflow(container).run({
        input: missing.map((value, i) => ({
          value,
          rank: existingValues.size + i,
          attribute_id: attributeId
        }))
      })
      logger.info(
        `Extended "Certifications" possible values with ${missing.length} new entries`
      )
    } else {
      logger.info('"Certifications" attribute already up to date')
    }
  }

  // 3. Backfill product attribute values (skip already-linked)
  let created = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    const certs = productCerts.get(product.id)
    if (!certs) continue

    const alreadyLinked = new Set(
      (product.attribute_values || [])
        .filter(
          (av: { attribute?: { handle?: string } }) =>
            av?.attribute?.handle === ATTRIBUTE_HANDLE
        )
        .map((av: { value: string }) => av.value)
    )

    for (const value of certs) {
      if (alreadyLinked.has(value)) {
        skipped++
        continue
      }
      try {
        await createAttributeValueWorkflow(container).run({
          input: {
            attribute_id: attributeId,
            product_id: product.id,
            value
          }
        })
        created++
      } catch (error) {
        failed++
        logger.warn(
          `Could not link "${value}" to ${product.title} (${product.id}): ${
            error instanceof Error ? error.message : error
          }`
        )
      }
    }
  }

  logger.info(
    `Certifications backfill done: ${created} values linked, ${skipped} already present, ${failed} failed`
  )
}
