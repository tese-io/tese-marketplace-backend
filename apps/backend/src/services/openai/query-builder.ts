import { ParsedQuery } from './openai-service'

export interface AlgoliaQuery {
  query: string // Search keywords
  filters: string // Algolia filter string
}

export class AlgoliaQueryBuilder {
  /**
   * Build complete Algolia query from parsed AI output
   */
  buildQuery(parsedQuery: ParsedQuery): AlgoliaQuery {
    return {
      query: this.buildSearchQuery(parsedQuery),
      filters: this.buildFilters(parsedQuery)
    }
  }

  /**
   * Build search query string from keywords
   */
  buildSearchQuery(parsedQuery: ParsedQuery): string {
    return parsedQuery.keywords.join(' ')
  }

  /**
   * Build Algolia filter string from parsed filters
   * Algolia filter syntax: https://www.algolia.com/doc/api-reference/api-parameters/filters/
   */
  buildFilters(parsedQuery: ParsedQuery): string {
    const filters: string[] = []

    // Price range filter
    if (parsedQuery.filters.priceMin !== null || parsedQuery.filters.priceMax !== null) {
      filters.push(this.buildPriceFilter(parsedQuery.filters.priceMin, parsedQuery.filters.priceMax))
    }

    // Condition filter (new, like-new, used, refurbished)
    if (parsedQuery.filters.conditions?.length) {
      filters.push(this.buildOrFilter('variants.condition', parsedQuery.filters.conditions))
    }

    // Color filter
    if (parsedQuery.filters.colors?.length) {
      filters.push(this.buildOrFilter('variants.color', parsedQuery.filters.colors))
    }

    // Size filter
    if (parsedQuery.filters.sizes?.length) {
      filters.push(this.buildOrFilter('variants.size', parsedQuery.filters.sizes))
    }

    // Category filter
    if (parsedQuery.filters.categories?.length) {
      filters.push(this.buildOrFilter('categories.name', parsedQuery.filters.categories))
    }

    // Brand filter
    if (parsedQuery.filters.brands?.length) {
      filters.push(this.buildOrFilter('brand.name', parsedQuery.filters.brands))
    }

    // Material filter - search in tags or description
    if (parsedQuery.filters.materials?.length) {
      filters.push(this.buildOrFilter('tags.value', parsedQuery.filters.materials))
    }

    // Sustainability features - search in tags
    if (parsedQuery.filters.sustainabilityFeatures?.length) {
      filters.push(this.buildOrFilter('tags.value', parsedQuery.filters.sustainabilityFeatures))
    }

    return filters.join(' AND ')
  }

  /**
   * Build price range filter
   * Example: variants.prices.amount >= 10 AND variants.prices.amount <= 50
   */
  private buildPriceFilter(min?: number | null, max?: number | null): string {
    const priceFilters: string[] = []

    if (min !== null && min !== undefined) {
      priceFilters.push(`variants.prices.amount >= ${min}`)
    }

    if (max !== null && max !== undefined) {
      priceFilters.push(`variants.prices.amount <= ${max}`)
    }

    return priceFilters.join(' AND ')
  }

  /**
   * Build OR filter for array values
   * Example: variants.size:"M" OR variants.size:"L"
   */
  private buildOrFilter(field: string, values: string[]): string {
    const orFilters = values.map(value => {
      // Escape quotes in values
      const escapedValue = value.replace(/"/g, '\\"')
      return `${field}:"${escapedValue}"`
    })

    // Wrap in parentheses if more than one filter
    if (orFilters.length > 1) {
      return `(${orFilters.join(' OR ')})`
    }

    return orFilters[0] || ''
  }
}

// Export a singleton instance
export const algoliaQueryBuilder = new AlgoliaQueryBuilder()
