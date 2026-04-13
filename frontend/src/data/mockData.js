export const products = [
  {
    id: 'btc-coin',
    name: 'Vintage Bitcoin Collectible',
    price: 299.99,
    originalPrice: 349.99,
    image: '🪙',
    category: 'collectibles',
    featured: true,
    inStock: true,
    stockCount: 5,
    rating: 4.9,
    reviewsCount: 42,
    seller: {
      id: 'crypto-collector',
      username: 'CryptoCollector',
      displayName: 'Alex Chen',
      verified: true,
    },
    description: 'A display-ready Bitcoin collectible with premium packaging.',
    tags: ['bitcoin', 'collector', 'display'],
  },
  {
    id: 'nft-art',
    name: 'Digital Art NFT Print',
    price: 149.99,
    originalPrice: 189.99,
    image: '🎨',
    category: 'art',
    featured: true,
    inStock: true,
    stockCount: 12,
    rating: 4.8,
    reviewsCount: 28,
    seller: {
      id: 'digital-artist',
      username: 'DigitalArtist',
      displayName: 'Maya Flores',
      verified: true,
    },
    description: 'A framed limited-run print paired with an NFT certificate.',
    tags: ['art', 'nft', 'limited'],
  },
  {
    id: 'wallet-kit',
    name: 'Hardware Wallet Starter Kit',
    price: 89.99,
    originalPrice: 109.99,
    image: '🔐',
    category: 'hardware',
    featured: false,
    inStock: true,
    stockCount: 20,
    rating: 4.6,
    reviewsCount: 63,
    seller: {
      id: 'secure-wallet',
      username: 'SecureWallet',
      displayName: 'Secure Wallet Labs',
      verified: true,
    },
    description: 'A beginner-friendly self-custody kit with setup guide.',
    tags: ['security', 'wallet', 'starter'],
  },
  {
    id: 'mining-rig',
    name: 'Ethereum Mining Rig',
    price: 2499.99,
    originalPrice: 2699.99,
    image: '⚡',
    category: 'hardware',
    featured: false,
    inStock: false,
    stockCount: 0,
    rating: 4.5,
    reviewsCount: 15,
    seller: {
      id: 'miner-pro',
      username: 'MinerPro',
      displayName: 'Miner Pro Supply',
      verified: true,
    },
    description: 'A turnkey mining setup for blockchain hardware enthusiasts.',
    tags: ['mining', 'rig', 'hardware'],
  },
  {
    id: 'gaming-asset',
    name: 'NFT Gaming Asset Bundle',
    price: 125.0,
    originalPrice: 149.99,
    image: '🎮',
    category: 'gaming',
    featured: true,
    inStock: true,
    stockCount: 8,
    rating: 4.7,
    reviewsCount: 34,
    seller: {
      id: 'game-master',
      username: 'GameMaster',
      displayName: 'Jordan Park',
      verified: false,
    },
    description: 'A curated pack of in-game items for Web3 titles.',
    tags: ['gaming', 'bundle', 'nft'],
  },
  {
    id: 'defi-guide',
    name: 'DeFi Strategy Handbook',
    price: 45.5,
    originalPrice: 59.0,
    image: '📘',
    category: 'education',
    featured: false,
    inStock: true,
    stockCount: 50,
    rating: 4.4,
    reviewsCount: 19,
    seller: {
      id: 'defi-trader',
      username: 'DeFiTrader',
      displayName: 'Riley Morgan',
      verified: true,
    },
    description: 'A practical guide to yield, wallets, and risk.',
    tags: ['defi', 'guide', 'education'],
  },
];

export const categories = [
  { id: 'all', label: 'All' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'art', label: 'Art' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'education', label: 'Education' },
];

export const userProfiles = {
  '1': {
    id: '1',
    username: 'CryptoCollector',
    displayName: 'Alex Chen',
    avatar: '👨‍💼',
    verified: true,
    bio: 'Collector of crypto memorabilia, wallet gear, and display-ready digital culture.',
    location: 'Toronto, Canada',
    joinedDate: '2020-03-15',
    stats: {
      followers: 2840,
      following: 456,
      sales: 127,
      rating: 4.8,
    },
    products: products.filter((product) => product.seller.username === 'CryptoCollector'),
  },
};

export const cartItems = [
  { productId: 'btc-coin', quantity: 1 },
  { productId: 'nft-art', quantity: 2 },
];

export function getProductById(id) {
  return products.find((product) => product.id === id);
}

export function getCartProducts() {
  return cartItems
    .map((entry) => {
      const product = getProductById(entry.productId);
      if (!product) return null;
      return { ...product, quantity: entry.quantity };
    })
    .filter(Boolean);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
