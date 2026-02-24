import OpenAI from 'openai'

export interface ParsedQuery {
  keywords: string[]
  filters: {
    priceMin?: number
    priceMax?: number
    sizes?: string[]
    colors?: string[]
    conditions?: string[]
    categories?: string[]
    brands?: string[]
    materials?: string[]
    sustainabilityFeatures?: string[]
  }
  intent: string
  confidence: number
}

const SYSTEM_PROMPT = `You are a search query parser for a sustainable marketplace. Extract search intent and parameters from natural language queries.

Available filters:
- Price range (in USD, EUR, GBP, PLN, etc.) - extract numeric values for min/max
- Size (XS, S, M, L, XL, XXL, 2XL, 3XL)
- Color (common color names: red, blue, green, black, white, gray, brown, yellow, orange, purple, pink, etc.)
- Condition (new, like-new, used, refurbished, excellent, good, fair)
- Categories (ESG audits, consulting, reporting, carbon offset, climate, circular economy, sustainable fashion, renewable energy, etc.)
- Brand names (extract any mentioned brand)
- Material (cotton, polyester, organic, recycled, wool, silk, leather, plastic, metal, wood, etc.)
- Sustainability features (sustainable, eco-friendly, organic, fair-trade, carbon-neutral, biodegradable, recycled, renewable, etc.)

IMPORTANT RULES:
1. Return ONLY valid JSON - no markdown formatting, no code blocks, no extra text
2. Extract all relevant information from the query
3. For price: look for numbers and currency symbols/words
4. For sizes: extract standard clothing sizes (S, M, L, etc.)
5. For colors: extract color names
6. For conditions: map quality descriptors to: new, like-new, used, refurbished
7. For categories: identify product/service categories mentioned
8. Confidence should be 0-1 based on query clarity and completeness
9. Keywords should be core search terms (nouns, product types, descriptors)

Return JSON with this EXACT structure (no additional fields):
{
  "keywords": ["search", "terms"],
  "filters": {
    "priceMin": number | null,
    "priceMax": number | null,
    "sizes": ["S", "M"] | null,
    "colors": ["red", "blue"] | null,
    "conditions": ["new"] | null,
    "categories": ["ESG audits"] | null,
    "brands": ["Nike"] | null,
    "materials": ["cotton"] | null,
    "sustainabilityFeatures": ["organic"] | null
  },
  "intent": "descriptive summary of user intent",
  "confidence": 0.95
}

Examples:
Query: "sustainable cotton t-shirts under $50"
Response: {"keywords":["t-shirt","sustainable","cotton"],"filters":{"priceMin":null,"priceMax":50,"sizes":null,"colors":null,"conditions":null,"categories":null,"brands":null,"materials":["cotton"],"sustainabilityFeatures":["sustainable"]},"intent":"User wants affordable sustainable cotton t-shirts","confidence":0.95}

Query: "red dress size M under 100 euros"
Response: {"keywords":["dress"],"filters":{"priceMin":null,"priceMax":100,"sizes":["M"],"colors":["red"],"conditions":null,"categories":null,"brands":null,"materials":null,"sustainabilityFeatures":null},"intent":"User wants a medium-sized red dress under 100 euros","confidence":0.95}

Query: "ESG audit services for manufacturing"
Response: {"keywords":["ESG","audit","manufacturing"],"filters":{"priceMin":null,"priceMax":null,"sizes":null,"colors":null,"conditions":null,"categories":["ESG audits"],"brands":null,"materials":null,"sustainabilityFeatures":null},"intent":"User seeking ESG audit services for manufacturing sector","confidence":0.90}`

export class OpenAIService {
  private openai?: OpenAI
  private initialized: boolean = false

  constructor() {
    // Lazy initialization to prevent startup failures if key is missing
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
        this.initialized = true
      } catch (error) {
        console.error('Failed to initialize OpenAI client:', error)
        this.initialized = false
      }
    } else {
      console.warn('OPENAI_API_KEY not found in environment variables. AI search will fallback to regular search.')
      this.initialized = false
    }
  }

  isInitialized(): boolean {
    return this.initialized && !!this.openai
  }

  async parseSearchQuery(query: string): Promise<ParsedQuery> {
    if (!this.isInitialized() || !this.openai) {
      throw new Error('OpenAI service not initialized')
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Parse this search query: "${query}"` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Low temperature for consistency
        max_tokens: 500,
        timeout: 10000, // 10 second timeout
      })

      const content = completion.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse the JSON response
      const parsed = JSON.parse(content) as ParsedQuery

      // Validate the response structure
      if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
        throw new Error('Invalid response structure: missing keywords array')
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        console.warn('Invalid confidence score, defaulting to 0.5')
        parsed.confidence = 0.5
      }

      // Log low confidence queries for monitoring
      if (parsed.confidence < 0.5) {
        console.warn(`Low confidence query parsing (${parsed.confidence}): "${query}"`)
      }

      return parsed
    } catch (error) {
      console.error('Error parsing search query with OpenAI:', error)
      throw error
    }
  }
}

// Export a singleton instance
export const openAIService = new OpenAIService()
