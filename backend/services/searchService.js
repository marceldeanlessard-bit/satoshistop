/**
 * Advanced Search Service (Meilisearch)
 * Provides fast, typo-tolerant, faceted search across products
 */

const logger = require('../middleware/logger');

class SearchService {
  constructor(db, cacheService) {
    this.db = db;
    this.cache = cacheService;

    // In production, initialize with MeiliSearch:
    // import MeiliSearch from 'meilisearch'
    // this.client = new MeiliSearch({
    //   host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
    //   apiKey: process.env.MEILISEARCH_API_KEY,
    // })
    // For now, using database search with indexing
  }

  // ========================================================================
  // SEARCH OPERATIONS
  // ========================================================================

  /**
   * Search products with advanced filters
   */
  async search(query, options = {}) {
    try {
      const {
        category = null,
        minPrice = 0,
        maxPrice = Infinity,
        chain = null,
        seller =null,
        sortBy = 'relevance', // relevance, price_asc, price_desc, rating, newest
        limit = 20,
        offset = 0,
        userId = null,
      } = options;

      // Log search query for analytics
      if (userId) {
        await this.db.searchQuery.create({
          data: {
            query,
            userId,
            resultsCount: 0, // Will update
            chain,
            category,
            priceRange: JSON.stringify({ min: minPrice, max: maxPrice }),
          },
        });
      }

      // Build where clause
      const where = {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { tags: { contains: query, mode: 'insensitive' } },
            ],
          },
          { isActive: true },
          { price: { gte: minPrice, lte: maxPrice } },
          category ? { category: { equals: category } } : {},
          seller ? { seller: { username: { equals: seller } } } : {},
        ].filter((clause) => Object.keys(clause).length > 0),
      };

      // Determine sort order
      let orderBy = [{ rating: 'desc' }, { viewCount: 'desc' }];

      switch (sortBy) {
        case 'price_asc':
          orderBy = [{ price: 'asc' }];
          break;
        case 'price_desc':
          orderBy = [{ price: 'desc' }];
          break;
        case 'rating':
          orderBy = [{ rating: 'desc' }];
          break;
        case 'newest':
          orderBy = [{ createdAt: 'desc' }];
          break;
        case 'trending':
          orderBy = [{ viewCount: 'desc' }];
          break;
      }

      // Execute search
      const [results, total] = await Promise.all([
        this.db.product.findMany({
          where,
          orderBy,
          skip: offset,
          take: limit,
          include: {
            seller: {
              select: { username: true, avatar: true },
            },
            _count: {
              select: { reviews: true, likes: true },
            },
          },
        }),
        this.db.product.count({ where }),
      ]);

      // Update search analytics
      if (userId) {
        await this.db.searchQuery.updateMany({
          where: { query, userId },
          data: { resultsCount: total },
        });
      }

      return {
        query,
        results,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSearchSuggestions(partial, limit = 10) {
    try {
      const cacheKey = `search:suggestions:${partial.toLowerCase()}`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Get suggestions from products
      const products = await this.db.product.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: partial, mode: 'insensitive' } },
                { tags: { contains: partial, mode: 'insensitive' } },
              ],
            },
            { isActive: true },
          ],
        },
        select: { name: true, category: true },
        distinct: ['category'],
        take: limit,
      });

      // Get categories matching partial
      const categories = await this.db.product.findMany({
        where: {
          category: { contains: partial, mode: 'insensitive' },
          isActive: true,
        },
        select: { category: true },
        distinct: ['category'],
        take: 5,
      });

      const suggestions = {
        products: products.map((p) => ({
          text: p.name,
          type: 'product',
        })),
        categories: categories.map((c) => ({
          text: c.category,
          type: 'category',
        })),
      };

      // Cache for 1 hour
      await this.cache.set(cacheKey, JSON.stringify(suggestions), 3600);

      return suggestions;
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return { products: [], categories: [] };
    }
  }

  /**
   * Advanced faceted search
   */
  async facetedSearch(query, options = {}) {
    try {
      // Get all facet options
      const [categories, priceRanges, chains, sellers] = await Promise.all([
        this.getFacets('category'),
        this.getPriceFacets(),
        this.getFacets('chain'),
        this.getSellerFacets(),
      ]);

      // Perform search
      const searchResults = await this.search(query, options);

      return {
        results: searchResults.results,
        facets: {
          categories: categories.map((cat) => ({
            name: cat._max.category,
            count: cat._count,
          })),
          priceRanges: priceRanges,
          acceptedChains: chains,
          topSellers: sellers.slice(0, 10),
        },
        facetsApplied: {
          category: options.category,
          priceRange: {
            min: options.minPrice,
            max: options.maxPrice,
          },
          chain: options.chain,
        },
      };
    } catch (error) {
      logger.error('Error in faceted search:', error);
      throw error;
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(limit = 20) {
    try {
      const cacheKey = 'search:trending';
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const trending = await this.db.searchQuery.groupBy({
        by: ['query'],
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      const result = trending.map((item) => ({
        query: item.query,
        searchCount: item._count.id,
      }));

      // Cache for 6 hours
      await this.cache.set(cacheKey, JSON.stringify(result), 21600);

      return result;
    } catch (error) {
      logger.error('Error getting trending searches:', error);
      return [];
    }
  }

  /**
   * Semantic search using embeddings (AI-powered)
   */
  async semanticSearch(query, limit = 10, category = null) {
    try {
      // Get query embedding
      const queryEmbedding = await this.getQueryEmbedding(query);

      // Find similar products using vector similarity
      const allProducts = await this.db.product.findMany({
        where: {
          AND: [
            { isActive: true },
            category ? { category } : {},
            { embeddings: { not: null } },
          ],
        },
        include: {
          seller: { select: { username: true } },
        },
      });

      // Calculate similarity scores
      const scored = allProducts.map((product) => {
        const embedding = JSON.parse(product.embeddings || '[]');
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        return {
          ...product,
          similarity,
        };
      });

      // Sort by similarity and return top results
      return scored
.sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(({ similarity, ...product }) => ({
          ...product,
          relevance: (similarity * 100).toFixed(2),
        }));
    } catch (error) {
      logger.error('Error in semantic search:', error);
      return [];
    }
  }

  // ========================================================================
  // FACETS & AGGREGATIONS
  // ========================================================================

  /**
   * Get category facets
   */
  async getFacets(field) {
    try {
      return await this.db.product.groupBy({
        by: [field],
        where: { isActive: true },
        _count: true,
        orderBy: { _count: 'desc' },
      });
    } catch (error) {
      logger.error(`Error getting ${field} facets:`, error);
      return [];
    }
  }

  /**
   * Get price range facets
   */
  async getPriceFacets() {
    try {
      return [
        { name: 'Under $100', min: 0, max: 100, count: 0 },
        { name: '$100 - $500', min: 100, max: 500, count: 0 },
        { name: '$500 - $1,000', min: 500, max: 1000, count: 0 },
        { name: '$1,000 - $5,000', min: 1000, max: 5000, count: 0 },
        { name: 'Above $5,000', min: 5000, max: Infinity, count: 0 },
      ];
    } catch (error) {
      logger.error('Error getting price facets:', error);
      return [];
    }
  }

  /**
   * Get seller facets
   */
  async getSellerFacets() {
    try {
      const sellers = await this.db.product.groupBy({
        by: ['sellerId'],
        where: { isActive: true },
        _count: true,
        orderBy: { _count: 'desc' },
        take: 20,
      });

      const sellerDetails = await this.db.user.findMany({
        where: { id: { in: sellers.map((s) => s.sellerId) } },
        select: { id: true, username: true, avatar: true },
      });

      return sellers.map((seller) => {
        const user = sellerDetails.find((u) => u.id === seller.sellerId);
        return {
          sellerId: seller.sellerId,
          username: user?.username,
          avatar: user?.avatar,
          productCount: seller._count,
        };
      });
    } catch (error) {
      logger.error('Error getting seller facets:', error);
      return [];
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Get embedding for query (placeholder)
   */
  async getQueryEmbedding(query) {
    // In production, would call OpenAI API or similar
    // For now, return dummy embedding
    const embedding = new Array(128).fill(0);

    // Simple hash-based feature
    for (let i = 0; i < query.length; i++) {
      embedding[i % 128] += query.charCodeAt(i) / 100;
    }

    return embedding;
  }

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
  }

  /**
   * Index product for search (called when product is created/updated)
   */
  async indexProduct(product) {
    try {
      // In production, would create index in Meilisearch
      logger.info(`Indexing product: ${product.id}`);

      // Could generate embeddings here
      // await this.generateEmbedding(product);

      return true;
    } catch (error) {
      logger.error('Error indexing product:', error);
      return false;
    }
  }
}

module.exports = SearchService;
