import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  HeartIcon,
  ShoppingBagIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

const UserProfile = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock profile data
      const mockProfile = {
        id: '1',
        username: 'CryptoCollector',
        displayName: 'Alex Chen',
        avatar: '👨‍💼',
        bio: 'Passionate collector of digital art and blockchain memorabilia. Always on the lookout for the next big thing in Web3.',
        location: 'San Francisco, CA',
        joinedDate: '2020-03-15',
        verified: true,
        stats: {
          followers: 2840,
          following: 456,
          products: 23,
          sales: 127,
          rating: 4.8,
          reviews: 89,
        },
        products: [
          {
            id: '1',
            name: 'Vintage Bitcoin Collectible',
            price: 299.99,
            image: '🪙',
            category: 'collectibles',
            rating: 4.8,
            reviews: 42,
          },
          {
            id: '2',
            name: 'Digital Art NFT',
            price: 149.99,
            image: '🎨',
            category: 'art',
            rating: 4.9,
            reviews: 28,
          },
        ],
        reviews: [
          {
            id: '1',
            product: { name: 'Rare Crypto Token', image: '🪙' },
            rating: 5,
            comment: 'Excellent seller! Fast shipping and great communication.',
            date: '2024-01-15',
            verified: true,
          },
        ],
      };

      setProfile(mockProfile);
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600">The user profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', count: undefined },
    { id: 'products', label: 'Products', count: profile.stats.products },
    { id: 'reviews', label: 'Reviews', count: profile.stats.reviews },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl">
              {profile.avatar}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
                {profile.verified && (
                  <ShieldCheckIcon className="w-6 h-6 text-blue-500" />
                )}
              </div>

              <p className="text-gray-600 mb-3">@{profile.username}</p>
              <p className="text-gray-700 mb-4 max-w-2xl">{profile.bio}</p>

              <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-1">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{profile.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Joined {new Date(profile.joinedDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex space-x-4 mb-4">
                <a href="#" className="text-blue-500 hover:text-blue-700">
                  Twitter
                </a>
                <a href="#" className="text-blue-500 hover:text-blue-700">
                  Website
                </a>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-6 py-2 rounded-lg font-medium ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{profile.stats.followers.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{profile.stats.following.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Following</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{profile.stats.products}</div>
              <div className="text-sm text-gray-600">Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{profile.stats.sales}</div>
              <div className="text-sm text-gray-600">Sales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{profile.stats.rating}</div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{profile.stats.reviews}</div>
              <div className="text-sm text-gray-600">Reviews</div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap border-b-2 py-6 px-1 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count && <span className="ml-1 text-gray-400">({tab.count})</span>}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="max-w-3xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">About {profile.displayName}</h3>
                <div className="prose prose-sm max-w-none">
                  <p>{profile.bio}</p>
                  <p>
                    {profile.displayName} has been an active member of the SatoshiStop community since{' '}
                    {new Date(profile.joinedDate).getFullYear()}. As a verified seller, they specialize in collecting unique digital assets and blockchain memorabilia.
                  </p>
                  <p>
                    With over {profile.stats.sales} successful sales and a {profile.stats.rating} star rating from {profile.stats.reviews} reviews, {profile.displayName} is committed to providing high-quality products to the Web3 community.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.products.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <Link to={`/product/${product.id}`}>
                      <div className="aspect-w-1 aspect-h-1 bg-gray-100 flex items-center justify-center text-4xl">
                        {product.image}
                      </div>
                    </Link>
                    <div className="p-4">
                      <Link to={`/product/${product.id}`}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="flex items-center mb-2">
                        <div className="flex items-center">
                          <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">
                            {product.rating} ({product.reviews})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900">
                          ${product.price}
                        </span>
                        <button className="p-2 text-gray-400 hover:text-red-500">
                          <HeartIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {profile.reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                        {review.product.image}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900">{review.product.name}</h3>
                          {review.verified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <div className="flex items-center mb-2">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-700 mb-2">{review.comment}</p>
                        <div className="text-sm text-gray-500">{review.date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

