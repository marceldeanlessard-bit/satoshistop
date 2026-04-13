import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  HandRaisedIcon,
  EyeIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const AuctionRoom = () => {
  const { id } = useParams();
  const [bidAmount, setBidAmount] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [isWatching, setIsWatching] = useState(false);
  const chatRef = useRef(null);

  // Mock data - replace with actual GraphQL query
  const { data: auction, isLoading } = useQuery(['auction', id], async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      id: '1',
      title: 'Rare Bitcoin Genesis Block Collectible',
      description: 'The ultimate collector\'s item - a piece representing the very first Bitcoin block ever mined.',
      currentBid: 1250.00,
      startingBid: 500.00,
      bidIncrement: 50.00,
      reservePrice: 1000.00,
      buyNowPrice: 2500.00,
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: 'active', // active, ended, cancelled
      totalBids: 23,
      watchers: 156,
      seller: {
        username: 'CryptoLegend',
        avatar: '👑',
        verified: true,
        rating: 4.9,
      },
      images: ['🪙', '📜', '🏆'],
      bids: [
        { id: '1', bidder: 'AnonBidder1', amount: 1250.00, time: new Date(Date.now() - 30000), avatar: '👤' },
        { id: '2', bidder: 'CryptoKing', amount: 1200.00, time: new Date(Date.now() - 120000), avatar: '👑' },
        { id: '3', bidder: 'NFTCollector', amount: 1150.00, time: new Date(Date.now() - 300000), avatar: '🎨' },
        { id: '4', bidder: 'BlockChainPro', amount: 1100.00, time: new Date(Date.now() - 600000), avatar: '⛓️' },
        { id: '5', bidder: 'DigitalAsset', amount: 1050.00, time: new Date(Date.now() - 900000), avatar: '💎' },
      ],
      chat: [
        { id: '1', user: 'Auctioneer', message: 'Welcome to the auction! Bidding starts at $500.', time: new Date(Date.now() - 1800000), type: 'system' },
        { id: '2', user: 'CryptoKing', message: 'Great piece! GL to all bidders', time: new Date(Date.now() - 1500000), avatar: '👑' },
        { id: '3', user: 'NFTCollector', message: 'Is this authenticated?', time: new Date(Date.now() - 1200000), avatar: '🎨' },
        { id: '4', user: 'Auctioneer', message: 'Yes, comes with full authentication certificate', time: new Date(Date.now() - 1150000), type: 'system' },
        { id: '5', user: 'BlockChainPro', message: 'Fair warning - I\'m here to win this!', time: new Date(Date.now() - 900000), avatar: '⛓️' },
      ],
    };
  });

  const timeLeft = auction ? Math.max(0, auction.endTime - new Date()) : 0;
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const isEndingSoon = timeLeft < 5 * 60 * 1000; // 5 minutes
  const isAlmostOver = timeLeft < 60 * 1000; // 1 minute

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [auction?.chat]);

  const handleBid = () => {
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= auction.currentBid) {
      // Show error
      return;
    }
    // Submit bid logic

  };

  const handleChat = () => {
    if (!chatMessage.trim()) return;
    // Send chat message logic

    setChatMessage('');
  };

  const getNextBidAmount = () => {
    return auction ? (auction.currentBid + auction.bidIncrement).toFixed(2) : '0.00';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="w-full h-96 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔨</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Auction Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The auction you're looking for doesn't exist or has ended.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Auction Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auction Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {auction.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {auction.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsWatching(!isWatching)}
                    className={`p-2 rounded-full transition-colors ${
                      isWatching
                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                  >
                    <HeartIcon className="w-5 h-5" fill={isWatching ? 'currentColor' : 'none'} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <EyeIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Seller Info */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                  {auction.seller.avatar}
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {auction.seller.username}
                  </span>
                  {auction.seller.verified && (
                    <span className="ml-2 text-blue-500">✓</span>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ⭐ {auction.seller.rating}
                  </div>
                </div>
              </div>

              {/* Auction Stats */}
              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <UserGroupIcon className="w-4 h-4" />
                  <span>{auction.watchers} watching</span>
                </div>
                <div className="flex items-center space-x-1">
                  <HandRaisedIcon className="w-4 h-4" />
                  <span>{auction.totalBids} bids</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>Started {new Date(auction.endTime - 2 * 60 * 60 * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Auction Images */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center text-9xl mb-4">
                {auction.images[0]}
              </div>
              <div className="flex space-x-2 overflow-x-auto">
                {auction.images.map((image, index) => (
                  <button
                    key={index}
                    className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center text-2xl border-2 border-transparent hover:border-blue-500 transition-colors"
                  >
                    {image}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Chat */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                  Live Chat
                </h3>
              </div>
              <div
                ref={chatRef}
                className="h-64 overflow-y-auto p-4 space-y-3"
              >
                {auction.chat.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    {message.type === 'system' ? (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        !
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs">
                        {message.avatar}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-medium ${
                          message.type === 'system'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {message.user}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(message.time).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {message.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                    placeholder="Type a message..."
                    className="flex-1 form-input"
                  />
                  <button
                    onClick={handleChat}
                    className="btn-primary px-4"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Auction Sidebar */}
          <div className="space-y-6">
            {/* Current Bid & Timer */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center mb-6">
                <div className={`text-3xl font-bold mb-2 ${
                  isAlmostOver
                    ? 'text-red-600 dark:text-red-400 animate-pulse'
                    : isEndingSoon
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  ${auction.currentBid.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Current Bid
                </div>

                {/* Timer */}
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                  isAlmostOver
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : isEndingSoon
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  <ClockIcon className="w-4 h-4" />
                  <span className="font-mono text-sm">
                    {hours.toString().padStart(2, '0')}:
                    {minutes.toString().padStart(2, '0')}:
                    {seconds.toString().padStart(2, '0')}
                  </span>
                </div>

                {isAlmostOver && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                    Auction ending soon!
                  </div>
                )}
              </div>

              {/* Bid Input */}
              <div className="space-y-3">
                <div>
                  <label className="form-label">Your Bid</label>
                  <div className="relative">
                    <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Min: $${getNextBidAmount()}`}
                      className="form-input pl-10"
                      min={getNextBidAmount()}
                      step={auction.bidIncrement}
                    />
                  </div>
                </div>

                <button
                  onClick={handleBid}
                  className="w-full btn-primary"
                  disabled={!bidAmount || parseFloat(bidAmount) <= auction.currentBid}
                >
                  <HandRaisedIcon className="w-5 h-5 inline mr-2" />
                  Place Bid
                </button>

                {auction.buyNowPrice && (
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Buy Now - ${auction.buyNowPrice.toFixed(2)}
                  </button>
                )}
              </div>

              {/* Bid History Preview */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Recent Bids
                </h4>
                <div className="space-y-2">
                  {auction.bids.slice(0, 3).map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs">
                          {bid.avatar}
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {bid.bidder}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${bid.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Auction Rules */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Auction Rules
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• All bids are final and binding</li>
                <li>• Payment due within 24 hours of auction end</li>
                <li>• Seller reserves the right to cancel auction</li>
                <li>• Shipping costs are buyer's responsibility</li>
                <li>• No returns on digital items</li>
              </ul>
            </div>

            {/* Watchers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Live Viewers ({auction.watchers})
              </h3>
              <div className="flex -space-x-2">
                {[...Array(Math.min(auction.watchers, 8))].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs"
                  >
                    👤
                  </div>
                ))}
                {auction.watchers > 8 && (
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                    +{auction.watchers - 8}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionRoom;