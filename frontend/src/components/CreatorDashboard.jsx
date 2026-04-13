import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  EyeIcon,
  HeartIcon,
  PlusIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const CreatorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');

  // Mock data - replace with actual GraphQL queries
  const { data: dashboardData, isLoading } = useQuery(['creator-dashboard', timeRange], async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      stats: {
        totalRevenue: 15420.50,
        totalSales: 127,
        totalViews: 15420,
        totalFollowers: 2840,
        revenueChange: 12.5,
        salesChange: 8.3,
        viewsChange: -2.1,
        followersChange: 15.7,
      },
      recentSales: [
        { id: '1', product: 'Digital Art NFT #1', buyer: 'CryptoFan', amount: 299.99, date: new Date(Date.now() - 86400000), status: 'completed' },
        { id: '2', product: 'Exclusive Collectible', buyer: 'NFTCollector', amount: 149.99, date: new Date(Date.now() - 172800000), status: 'completed' },
        { id: '3', product: 'Limited Edition Token', buyer: 'BlockChainPro', amount: 79.99, date: new Date(Date.now() - 259200000), status: 'pending' },
      ],
      topProducts: [
        { id: '1', name: 'Digital Art NFT #1', sales: 45, revenue: 13495.55, views: 2340, image: '🎨' },
        { id: '2', name: 'Exclusive Collectible', sales: 32, revenue: 4799.68, views: 1890, image: '🪙' },
        { id: '3', name: 'Limited Edition Token', sales: 28, revenue: 2239.72, views: 1456, image: '🏆' },
      ],
      revenueChart: [
        { date: '2024-01-01', revenue: 1200 },
        { date: '2024-01-02', revenue: 1350 },
        { date: '2024-01-03', revenue: 1180 },
        { date: '2024-01-04', revenue: 1420 },
        { date: '2024-01-05', revenue: 1680 },
        { date: '2024-01-06', revenue: 1520 },
        { date: '2024-01-07', revenue: 1890 },
      ],
      followers: [
        { date: '2024-01-01', count: 2500 },
        { date: '2024-01-02', count: 2520 },
        { date: '2024-01-03', count: 2545 },
        { date: '2024-01-04', count: 2570 },
        { date: '2024-01-05', count: 2610 },
        { date: '2024-01-06', count: 2650 },
        { date: '2024-01-07', count: 2680 },
      ],
    };
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'products', name: 'Products', icon: ShoppingBagIcon },
    { id: 'analytics', name: 'Analytics', icon: ArrowTrendingUpIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon },
  ];

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' && title.includes('Revenue') ? `$${value.toLocaleString()}` : value.toLocaleString()}
          </p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {change >= 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              <span>{Math.abs(change)}% from last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
          <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Creator Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your products and track your success
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="form-input w-32"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="btn-primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              New Product
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={dashboardData.stats.totalRevenue}
                change={dashboardData.stats.revenueChange}
                icon={CurrencyDollarIcon}
                color="green"
              />
              <StatCard
                title="Total Sales"
                value={dashboardData.stats.totalSales}
                change={dashboardData.stats.salesChange}
                icon={ShoppingBagIcon}
                color="blue"
              />
              <StatCard
                title="Total Views"
                value={dashboardData.stats.totalViews}
                change={dashboardData.stats.viewsChange}
                icon={EyeIcon}
                color="purple"
              />
              <StatCard
                title="Followers"
                value={dashboardData.stats.totalFollowers}
                change={dashboardData.stats.followersChange}
                icon={UserGroupIcon}
                color="pink"
              />
            </div>

            {/* Charts and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Revenue Trend
                </h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {dashboardData.revenueChart.map((point, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(point.revenue / 2000) * 100}%` }}
                        transition={{ delay: index * 0.1 }}
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        ${point.revenue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Sales */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Sales
                </h3>
                <div className="space-y-4">
                  {dashboardData.recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center text-lg">
                          🛒
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {sale.product}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            by {sale.buyer} • {sale.date.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${sale.amount}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          sale.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {sale.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Performing Products
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Product</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Sales</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Revenue</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topProducts.map((product) => (
                      <tr key={product.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center text-lg">
                              {product.image}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{product.sales}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">${product.revenue.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{product.views.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Your Products
              </h2>
              <button className="btn-primary">
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardData.topProducts.map((product) => (
                <div key={product.id} className="card card-hover">
                  <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center text-4xl mb-4">
                    {product.image}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span>{product.sales} sales</span>
                    <span>${product.revenue.toFixed(2)} revenue</span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex-1 btn-secondary text-sm">
                      Edit
                    </button>
                    <button className="flex-1 btn-ghost text-sm">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Detailed Revenue Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Revenue Analytics
                </h3>
                <div className="h-64">
                  {/* Placeholder for detailed chart */}
                  <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Detailed revenue chart would go here
                  </div>
                </div>
              </div>

              {/* Follower Growth */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Follower Growth
                </h3>
                <div className="h-64">
                  {/* Placeholder for follower chart */}
                  <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Follower growth chart would go here
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    4.8
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Average Rating
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                    92%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Customer Satisfaction
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    1.2k
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Monthly Visitors
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Creator Profile Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Display Name</label>
                  <input type="text" className="form-input" defaultValue="CryptoLegend" />
                </div>
                <div>
                  <label className="form-label">Bio</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    defaultValue="Digital artist and NFT creator specializing in blockchain-based collectibles."
                  />
                </div>
                <div>
                  <label className="form-label">Website</label>
                  <input type="url" className="form-input" defaultValue="https://cryptolegend.art" />
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="notifications" className="text-blue-600 focus:ring-blue-500" defaultChecked />
                  <label htmlFor="notifications" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable sale notifications
                  </label>
                </div>
                <button className="btn-primary">
                  Save Changes
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Payment Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Primary Wallet Address</label>
                  <input
                    type="text"
                    className="form-input font-mono text-sm"
                    defaultValue="0x1234567890abcdef1234567890abcdef12345678"
                  />
                </div>
                <div>
                  <label className="form-label">PayPal Email (Optional)</label>
                  <input type="email" className="form-input" placeholder="your@email.com" />
                </div>
                <button className="btn-primary">
                  Update Payment Info
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorDashboard;