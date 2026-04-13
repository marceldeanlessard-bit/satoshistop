import React, { useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Footer from './components/Footer';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import ProductDetail from './components/ProductDetail';
import ProductGrid from './components/ProductGrid';
import RegisterModal from './components/RegisterModal';
import SearchResults from './components/SearchResults';
import UserProfile from './components/UserProfile';
import './styles/main.css';

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Header
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenRegister={() => setIsRegisterOpen(true)}
          />
          <main className="min-h-[calc(100vh-12rem)]">
            <Routes>
              <Route path="/" element={<ProductGrid />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/profile/:id" element={<UserProfile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <LoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onSwitchToRegister={() => {
              setIsLoginOpen(false);
              setIsRegisterOpen(true);
            }}
          />
          <RegisterModal
            isOpen={isRegisterOpen}
            onClose={() => setIsRegisterOpen(false)}
            onSwitchToLogin={() => {
              setIsRegisterOpen(false);
              setIsLoginOpen(true);
            }}
          />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
