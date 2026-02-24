import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import type { StoreAiSearchProductsType } from './validators'
import { openAIService } from '../../../../services/openai/openai-service'
import { algoliaQueryBuilder } from '../../../../services/openai/query-builder'
import type AlgoliaModuleService from '../../../../../../packages/modules/algolia/src/service'
import { IndexType } from '@mercurjs/framework'

/**
 * @oas [post] /store/products/ai-search
 * operationId: "StoreAiSearchProducts"
 * summary: "AI-powered natural language product search"
 * description: "Search products using natural language queries. Powered by OpenAI and Algolia."
 * x-authenticated: false
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - query
 *         properties:
 *           query:
 *             type: string
 *             description: Natural language search query
 *             example: "sustainable cotton t-shirts under $50"
 *           page:
 *             type: number
 *             default: 0
 *           hitsPerPage:
 *             type: number
 *             default: 12
 *           region_id:
 *             type: string
 *           customer_id:
 *             type: string
 *           facets:
 *             type: array
 *             items:
 *               type: string
 *           currency_code:
 *             type: string
 *           enable_ai:
 *             type: boolean
 *             default: true
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             products:
 *               type: array
 *               items:
 *                 type: object
 *             nbHits:
 *               type: number
 *             page:
 *               type: number
 *             nbPages:
 *               type: number
 *             hitsPerPage:
 *               type: number
 *             facets:
 *               type: object
 *             processingTimeMS:
 *               type: number
 *             ai_metadata:
 *               type: object
 *               properties:
 *                 parsed_query:
 *                   type: object
 *                 applied_filters:
 *                   type: string
 *                 confidence:
 *                   type: number
 *                 processing_time_ms:
 *                   type: number
 * tags:
 *   - Store Products
 */
export const POST = async (
  req: MedusaRequest<StoreAiSearchProductsType>,
  res: MedusaResponse
) => {
  const body = req.validatedBody
  const { query, page = 0, hitsPerPage = 12, facets, enable_ai = true } = body

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ message: 'Query is required' })
  }

  try {
    const algoliaService: AlgoliaModuleService = req.scope.resolve(Modules.ALGOLIA)

    let searchQuery = query
    let filters = ''
    let aiMetadata: any = undefined
    const aiStartTime = Date.now()

    // Try AI parsing if enabled and OpenAI is available
    if (enable_ai && openAIService.isInitialized()) {
      try {
        const parsedQuery = await openAIService.parseSearchQuery(query)
        const algoliaQuery = algoliaQueryBuilder.buildQuery(parsedQuery)

        searchQuery = algoliaQuery.query
        filters = algoliaQuery.filters

        aiMetadata = {
          parsed_query: parsedQuery,
          applied_filters: filters,
          confidence: parsedQuery.confidence,
          processing_time_ms: Date.now() - aiStartTime
        }

        console.log('AI search parsed query:', {
          original: query,
          keywords: searchQuery,
          filters,
          confidence: parsedQuery.confidence
        })
      } catch (error) {
        console.error('AI query parsing failed, falling back to keyword search:', error)
        // Fallback to regular keyword search
        searchQuery = query
        filters = ''
      }
    } else {
      console.log('AI parsing disabled or not available, using keyword search')
    }

    // Execute Algolia search
    const searchResult = await algoliaService.search({
      index: IndexType.PRODUCT,
      query: searchQuery,
      filters: filters || undefined,
      page,
      hitsPerPage,
      facets: facets || ['variants.color', 'variants.condition', 'variants.size', 'categories.name']
    })

    // Extract results from Algolia response
    const firstResult = searchResult.results?.[0]

    if (!firstResult) {
      return res.status(200).json({
        products: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
        hitsPerPage,
        facets: {},
        processingTimeMS: 0,
        ai_metadata: aiMetadata
      })
    }

    return res.status(200).json({
      products: firstResult.hits || [],
      nbHits: firstResult.nbHits || 0,
      page: firstResult.page || 0,
      nbPages: firstResult.nbPages || 0,
      hitsPerPage: firstResult.hitsPerPage || hitsPerPage,
      facets: firstResult.facets || {},
      processingTimeMS: firstResult.processingTimeMS || 0,
      ai_metadata: aiMetadata
    })
  } catch (error) {
    console.error('AI search error:', error)
    const message = error instanceof Error ? error.message : 'Search failed'
    return res.status(500).json({ message })
  }
}
