import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HeartIcon, ShoppingCartIcon, ShareIcon, StarIcon, ClockIcon, UserIcon, ShieldCheckIcon, GlobeAltIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const ProductDetail = () => {
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockProduct = {
        id: '1',
        name: 'Vintage Bitcoin Collectible',
        description: 'This rare Bitcoin collectible represents the early days of cryptocurrency.',
        price: 299.99,
        originalPrice: 399.99,
        images: ['🪙', '📜', '🏆'],
        category: 'collectibles',
        seller: {
          username: 'CryptoCollector',
          verified: true,
          rating: 4.8,
        },
        rating: 4.8,
        reviews: 42,
        tags: ['bitcoin', 'crypto', 'collectible'],
        shipping: {
          free: true,
          estimatedDays: 3,
        },
        reviews: [
          {
            id: 1,
            user: 'CryptoFan2023',
            rating: 5,
            date: '2024-01-15',
            comment: 'Stunning piece!',
            verified: true,
          },
        ],
      };

      setProduct(mockProduct);
      setIsLoading(false);
    };

    loadProduct();
  }, [id]);

  const handleAddToCart = () => {

  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="aspect-square bg-gray-200 rounded-lg"></div>
                <div className="flex space-x-2">
                  <div className="w-16 h-16 bg-gray-200 rounded"></div>
                  <div className="w-16 h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8 lg:grid lg:grid-cols-2 lg:gap-8 mb-8">
          {/* Images */}
          <div className="space-y-4 mb-8 lg:mb-0">
            <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-8xl shadow-lg">
              {product.images[selectedImage]}
            </div>
            <div className="flex space-x-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded border-2 flex items-center justify-center text-3xl ${selectedImage === idx ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {img}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <div className="flex items-center mb-4">
              {[1,2,3,4,5].map((star) => (
                <StarIcon key={star} className="w-6 h-6 text-yellow-400 fill-current" />
              ))}
              <span className="ml-2 text-sm text-gray-600">{product.rating} ({product.reviews} reviews)</span>
            </div>
            <div className="text-4xl font-bold mb-6">${product.price}</div>

            {/* Quantity */}
            <div className="flex items-center space-x-4 mb-6">
              <label className="text-lg font-medium">Quantity:</label>
              <div className="flex border rounded-lg p-1">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-1 hover:bg-gray-100">-</button>
                <span className="px-4 font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(10, quantity + 1))} className="px-3 py-1 hover:bg-gray-100">+</button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 mb-6">
              <button onClick={handleAddToCart} className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700">
                Add to Cart
              </button>
              <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                Buy Now
              </button>
            </div>

            {/* Seller */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                  C
                </div>
                <div>
                  <div className="font-medium">{product.seller.username}</div>
                  <div className="flex items-center text-sm text-gray-600">
                    <StarIcon className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                    4.8 (1247 sales)
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <ClockIcon className="w-4 h-4 mr-1" />
                Ships in 3 days • Free shipping
              </div>
              <div className="flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex border-b mb-6">
              <button className={`px-6 py-3 font-medium ${activeTab === 'description' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:border-gray-300'}`} onClick={() => setActiveTab('description')}>
                Description
              </button>
              <button className={`px-6 py-3 font-medium ${activeTab === 'reviews' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:border-gray-300'}`} onClick={() => setActiveTab('reviews')}>
                Reviews ({product.reviews})
              </button>
            </div>
            {activeTab === 'description' && (
              <p className="text-gray-700">
                This rare Bitcoin collectible represents the early days of cryptocurrency. Featuring intricate details and historical significance, this piece is perfect for any crypto enthusiast or collector. Limited edition with certificate of authenticity.
              </p>
            )}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <StarIcon className="w-6 h-6 text-yellow-400 fill-current" />
                  <StarIcon className="w-6 h-6 text-yellow-400 fill-current" />
                  <StarIcon className="w-6 h-6 text-yellow-400 fill-current" />
                  <StarIcon className="w-6 h-6 text-yellow-400 fill-current" />
                  <StarIcon className="w-6 h-6 text-yellow-400 fill-current" />
                  <span className="font-medium">CryptoFan2023</span>
                  <span className="text-sm text-gray-500">1 week ago</span>
                </div>
                <p className="text-gray-700">Amazing quality! Worth every penny for a Bitcoin collector.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

