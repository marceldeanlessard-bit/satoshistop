import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  StarIcon,
  HeartIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const query = searchParams.get('q') || '';

  useEffect(() => {
    const loadSearchResults = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock search results
      const mockResults = {
        query,
        totalResults: 1247,
        products: [
          {
            id: '1',
            name: 'Vintage Bitcoin Collectible',
            price: 299.99,
            originalPrice: 399.99,
            image: '🪙',
            category: 'collectibles',
            condition: 'new',
            seller: { username: 'CryptoCollector', verified: true, rating: 4.8 },
            rating: 4.8,
            reviews: 42,
            inStock: true,
            featured: true,
            tags: ['bitcoin', 'crypto', 'collectible'],
          },
          {
            id: '2',
            name: 'Digital Art NFT',
            price: 149.99,
            image: '🎨',
            category: 'art',
            condition: 'new',
            seller: { username: 'DigitalArtist', verified: true, rating: 4.9 },
            rating: 4.9,
            reviews: 28,
            inStock: true,
            featured: false,
            tags: ['nft', 'art', 'digital'],
          },
          {
            id: '3',
            name: 'Crypto Mining Hardware',
            price: 2499.99,
            image: '⚡',
            category: 'hardware',
            condition: 'used',
            seller: { username: 'MinerPro', verified: true, rating: 4.7 },
            rating: 4.7,
            reviews: 15,
            inStock: true,
            featured: false,
            tags: ['mining', 'hardware', 'crypto'],
          },
        ],
      };

      setSearchResults(mockResults);
      setIsLoading(false);
    };

    if (query) {
      loadSearchResults();
    }
  }, [query]);

  if (!query) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MagnifyingGlassIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No search query</h2>
          <p className="text-gray-600">Please enter a search term to find products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Results for "{query}"
          </h1>
          {searchResults && (
            <p className="text-gray-600">
              Found {searchResults.totalResults} results
            </p>
          )}
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className={`w-64 ${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>

              {/* Sort Options */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sort By</h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range</h4>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min price"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max price"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
                <div className="space-y-2">
                  {['All', 'Collectibles', 'Art', 'Hardware', 'Tokens', 'Gaming'].map((cat) => (
                    <label key={cat} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                    <div className="flex space-x-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults ? (
              <div className="space-y-4">
                {searchResults.products.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex space-x-6">
                      <Link to={`/product/${product.id}`}>
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                          {product.image}
                        </div>
                      </Link>

                      <div className="flex-1">
                        <Link to={`/product/${product.id}`}>
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 mb-2">
                            {product.name}
                          </h3>
                        </Link>

                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <span>by {product.seller.username}</span>
                          {product.seller.verified && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Verified
                            </span>
                          )}
                        </div>

                        <div className="flex items-center mb-4">
                          <div className="flex items-center">
                            <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-600 ml-1">
                              {product.rating} ({product.reviews} reviews)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-2xl font-bold text-gray-900">
                              ${product.price}
                            </span>
                            {product.originalPrice && (
                              <span className="text-sm text-gray-500 line-through">
                                ${product.originalPrice}
                              </span>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <button className="p-2 text-gray-400 hover:text-red-500">
                              <HeartIcon className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-blue-500">
                              <ShoppingCartIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {product.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;

