import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCartIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  HeartIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  TruckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

const Cart = () => {
  const useCartStore = require('../stores/cartStore').useCartStore;
  const { error } = useCartStore();
  const cartStore = useCartStore();
  const { items: cartItems, summary, isLoading, fetchCart } = cartStore;
  const updateQuantity = cartStore.updateQuantity;
  const removeItem = cartStore.removeItem;

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XMarkIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load cart</h2>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchCart}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some amazing digital assets to get started!</p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            {cartItems.length} items
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
{cartItems.map((item) => {
              const quantity = item.quantity || 1;
              const maxQuantity = item.maxQuantity || 99;
              return (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex space-x-4">
                    <Link to={`/product/${item.productId}`}>
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {item.image}
                      </div>
                    </Link>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            to={`/product/${item.productId}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                          >
                            {item.name}
                          </Link>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <span>by {item.seller.username}</span>
                            {item.seller.verified && (
                              <ShieldCheckIcon className="w-4 h-4 text-green-500 ml-1" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {item.shipping}
                          </div>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center border border-gray-300 rounded-md">
                            <button
                              onClick={() => updateQuantity(item.id, quantity - 1)}
                              className="px-3 py-2 text-gray-600 hover:text-gray-900"
                            >
                              <MinusIcon className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-2 text-center min-w-12">{quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, quantity + 1)}
                              className="px-3 py-2 text-gray-600 hover:text-gray-900"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-sm text-gray-600">
                            Max: {maxQuantity}
                          </span>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            ${(item.price * quantity).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            ${item.price.toFixed(2)} each
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                  <span className="font-medium">${summary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {summary.shipping === 0 ? 'Free' : `$${summary.shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${summary.tax.toFixed(2)}</span>
                </div>
                {summary.savings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Savings</span>
                    <span>-${cart.summary.savings.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${summary.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  to="/checkout"
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <CreditCardIcon className="w-5 h-5" />
                  <span>Proceed to Checkout</span>
                </Link>

                <Link
                  to="/"
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 flex items-center justify-center"
                >
                  Continue Shopping
                </Link>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <TruckIcon className="w-4 h-4" />
                  <span>Free shipping over $50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

