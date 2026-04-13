import React from 'react';

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-medium text-slate-900">Satoshi Stop</div>
          <div>Clean mock storefront shell for frontend development.</div>
        </div>
        <div className="flex gap-4">
          <span>Browse</span>
          <span>Cart</span>
          <span>Checkout</span>
          <span>Profile</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
