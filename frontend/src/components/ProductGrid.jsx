import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { categories, formatCurrency } from '../data/mockData';
import AIShoppingAssistant from './AIShoppingAssistant';
import { useProducts } from '../hooks/useApi';

const ProductGrid = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [query, setQuery] = useState('');
  const { fetchProducts } = useProducts();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (query.trim()) params.search = query.trim();

      const data = await fetchProducts(params);
      setProducts(data.products || []);
    } catch (err) {

      setError('Failed to load products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, query, fetchProducts]);

  const filteredProducts = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !searchText ||
        product.name.toLowerCase().includes(searchText) ||
        product.description?.toLowerCase().includes(searchText) ||
        product.tags?.some((tag) => tag.toLowerCase().includes(searchText));
      return matchesQuery;
    });
  }, [products, query]);

  if (error && products.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">{error}</h2>
        <button onClick={loadProducts} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-amber-100 via-orange-50 to-sky-50 px-6 py-10 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">Marketplace</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Browse crypto-inspired products with an AI shopping concierge.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-600">
              Real products from Satoshi Stop marketplace, powered by backend API.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, tags, descriptions..."
                className="form-input rounded-2xl border-slate-200 bg-white"
              />
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={selectedCategory === category.id ? 'btn-primary' : 'btn-secondary'}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 backdrop-blur">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              <SparklesIcon className="h-4 w-4" />
              Backend Connected
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Live marketplace data</h2>
            <p className="mt-2 text-sm text-slate-600">
              Real products, sellers, ratings synced from backend API. Search, filter, and browse live inventory.
            </p>
            <div className="mt-5 grid gap-3 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4">Live product data via /api/products</div>
              <div className="rounded-2xl bg-slate-50 p-4">Search, category filters, sorting</div>
              <div className="rounded-2xl bg-slate-50 p-4">Real seller profiles and ratings</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <AIShoppingAssistant />
      </section>

      <section className="mb-10">
        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <article key={product.id} className="card rounded-3xl border-slate-200 bg-white hover:shadow-xl transition-all">
                <Link to={`/product/${product.id}`} className="block">
                  <div className="mb-5 flex h-48 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-50 to-orange-50 text-6xl">
                    {product.image || product.images?.[0] || '🛍️'}
                  </div>
                </Link>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
                    {product.category}
                  </span>
                  {product.featured && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                      Featured
                    </span>
                  )}
                </div>
                <Link to={`/product/${product.id}`} className="block">
                  <h2 className="text-xl font-semibold text-slate-900 line-clamp-2">{product.name}</h2>
                </Link>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{product.description}</p>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold text-slate-900">{formatCurrency(product.price)}</div>
                    {product.seller?.displayName && (
                      <div className="text-sm text-slate-500">
                        by {product.seller.displayName} • {product.rating?.toFixed(1)}/5
                      </div>
                    )}
                  </div>
                  <Link to={`/product/${product.id}`} className="btn-primary whitespace-nowrap">
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>

      {filteredProducts.length === 0 && !loading && (
        <section className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">No products found</h2>
          <p className="mt-2 text-slate-600 max-w-md mx-auto">
            Try adjusting your search or category filter, or ask the AI concierge for recommendations.
          </p>
        </section>
      )}
    </div>
  );
};

export default ProductGrid;

