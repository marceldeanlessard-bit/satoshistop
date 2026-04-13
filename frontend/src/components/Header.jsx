import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCartIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';

const Header = ({ onOpenLogin, onOpenRegister }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate(`/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg shadow-sm">
            ₿
          </div>
          <div>
            <div className="text-lg font-semibold">Satoshi Stop</div>
            <div className="text-xs text-slate-500">Mock marketplace preview</div>
          </div>
        </Link>

        <form onSubmit={handleSubmit} className="hidden max-w-xl flex-1 md:block">
          <div className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, sellers, or categories"
              className="form-input w-full rounded-full border-slate-200 bg-slate-50 pl-5 pr-12"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Link to="/cart" className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <ShoppingCartIcon className="h-6 w-6" />
          </Link>
          <Link to="/profile/1" className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <UserIcon className="h-6 w-6" />
          </Link>
          <button onClick={onOpenLogin} className="btn-secondary hidden sm:inline-flex">
            Sign in
          </button>
          <button onClick={onOpenRegister} className="btn-primary">
            Create account
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
