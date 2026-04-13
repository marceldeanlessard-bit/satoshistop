import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CodeBracketIcon,
  KeyIcon,
  BeakerIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CloudIcon,
  ShieldCheckIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

const APIDeveloperPortal = () => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('overview');
  const [apiKey, setApiKey] = useState('');
  const [usageStats, setUsageStats] = useState({
    requests: 0,
    rateLimit: 1000,
    errors: 0,
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: DocumentTextIcon },
    { id: 'keys', name: 'API Keys', icon: KeyIcon },
    { id: 'docs', name: 'Documentation', icon: CodeBracketIcon },
    { id: 'testing', name: 'API Testing', icon: BeakerIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
  ];

  const endpoints = [
    {
      method: 'GET',
      path: '/api/products',
      description: 'Get marketplace products',
      parameters: ['limit', 'offset', 'category', 'search'],
    },
    {
      method: 'GET',
      path: '/api/products/{id}',
      description: 'Get product details',
      parameters: ['id'],
    },
    {
      method: 'POST',
      path: '/api/orders',
      description: 'Create new order',
      parameters: ['productId', 'quantity', 'paymentMethod'],
    },
    {
      method: 'GET',
      path: '/api/user/profile',
      description: 'Get user profile',
      parameters: [],
    },
    {
      method: 'GET',
      path: '/api/analytics/market',
      description: 'Get market analytics',
      parameters: ['period', 'metrics'],
    },
  ];

  const generateApiKey = () => {
    const newKey = 'sk_' + Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15);
    setApiKey(newKey);
    localStorage.setItem('satoshi_api_key', newKey);
  };

  useEffect(() => {
    const storedKey = localStorage.getItem('satoshi_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }

    // Mock usage stats
    setUsageStats({
      requests: Math.floor(Math.random() * 1000),
      rateLimit: 1000,
      errors: Math.floor(Math.random() * 10),
    });
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Welcome to SatoshiStop API</h2>
              <p className="text-blue-100">
                Integrate with our Web3 marketplace platform. Access products, orders, analytics, and more.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <CloudIcon className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold">RESTful API</h3>
                    <p className="text-gray-600 dark:text-gray-400">Simple HTTP endpoints</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold">Secure</h3>
                    <p className="text-gray-600 dark:text-gray-400">API key authentication</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <CpuChipIcon className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold">Web3 Ready</h3>
                    <p className="text-gray-600 dark:text-gray-400">Blockchain integration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'keys':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">API Key Management</h3>

              {apiKey ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Your API Key</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={apiKey}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-700"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(apiKey)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Security Notice</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Keep your API key secure. Do not share it publicly or commit it to version control.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium mb-2">No API Key Generated</h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Generate an API key to start using the SatoshiStop API.
                  </p>
                  <button
                    onClick={generateApiKey}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Generate API Key
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'docs':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">API Endpoints</h3>

              <div className="space-y-4">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        endpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {endpoint.method}
                      </span>
                      <div className="flex-1">
                        <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {endpoint.path}
                        </code>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {endpoint.description}
                        </p>
                        {endpoint.parameters.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Parameters: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {endpoint.parameters.map((param, paramIndex) => (
                                <span key={paramIndex} className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                                  {param}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Authentication</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">API Key Header</h4>
                  <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Rate Limits</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• 1000 requests per hour for basic tier</li>
                    <li>• 10000 requests per hour for premium tier</li>
                    <li>• Rate limit headers included in responses</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'testing':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">API Testing Console</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Endpoint</label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    {endpoints.map((endpoint, index) => (
                      <option key={index} value={endpoint.path}>
                        {endpoint.method} {endpoint.path}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Request Body (JSON)</label>
                  <textarea
                    className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm"
                    placeholder='{"key": "value"}'
                  />
                </div>

                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  Send Request
                </button>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{usageStats.requests}</h3>
                    <p className="text-gray-600 dark:text-gray-400">API Requests</p>
                  </div>
                  <ChartBarIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{usageStats.rateLimit - usageStats.requests}</h3>
                    <p className="text-gray-600 dark:text-gray-400">Remaining</p>
                  </div>
                  <ShieldCheckIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{usageStats.errors}</h3>
                    <p className="text-gray-600 dark:text-gray-400">Errors</p>
                  </div>
                  <CpuChipIcon className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Usage Over Time</h3>
              <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Usage chart will be displayed here</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Developer Portal</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Integrate with SatoshiStop's Web3 marketplace platform
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIDeveloperPortal;