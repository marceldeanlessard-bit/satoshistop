# SatoshiStop - Complete Implementation Guide

## Overview

SatoshiStop is a comprehensive peer-to-peer cryptocurrency marketplace with modern security, state management, and scalability improvements implemented across the entire stack.

## 🚀 New Features & Improvements

### Backend Security & Infrastructure

#### 1. **Security Middleware** (`middleware/security.js`)
- **Helmet.js**: HTTP security headers protection
- **Rate Limiting**: Configurable limits for different endpoints
  - General: 100 requests per 15 minutes
  - Auth: 5 attempts per 15 minutes
  - Registration: 3 per hour
  - Payment: 10 per minute
- **Input Sanitization**: Automatic XSS protection
- **CORS Configuration**: Whitelisted origins

#### 2. **Advanced Error Handling** (`middleware/errors.js`, `middleware/errorHandler.js`)
- Custom error classes: `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `DatabaseError`, `PaymentError`, `Web3Error`
- Centralized error response formatting
- Async error wrapper with `asyncHandler`
- Comprehensive error logging with Winston

#### 3. **Authentication & Authorization** (`middleware/auth.js`)
- `verifyToken`: Bearer token validation
- `optionalAuth`: Optional authentication
- `requireRole`: Role-based access control
- `requireSeller`: Seller-only access
- `requireAdmin`: Admin-only access

#### 4. **Input Validation** (`middleware/validators.js`)
- Joi schema validation for all endpoints
- Schemas for: auth, products, orders, profiles, messages, reviews, sellers
- Automatic request body validation middleware

#### 5. **Logging** (`middleware/logger.js`)
- Winston logger with multiple transports
- File and console output
- Error and app-specific log files
- Configurable log levels

### Backend Services

#### 1. **Email Service** (`services/emailService.js`)
- Nodemailer integration
- Pre-built templates:
  - Verification emails
  - Password reset emails
  - Order confirmations
  - Seller notifications
- Try-catch with fallback

#### 2. **Web3/Blockchain Service** (`services/web3Service.js`)
- Wallet signature verification
- Balance inquiries
- Transaction sending
- Escrow management (placeholder)
- Gas price monitoring
- Address validation and formatting

#### 3. **Cache Service** (`services/cacheService.js`)
- Redis with memory fallback
- Key expiration support
- Pattern-based cache invalidation
- Cache middleware factory
- Pagination helper

#### 4. **Admin Service** (`services/adminService.js`)
- Platform statistics
- User suspension/banning
- Product flagging and removal
- Dispute resolution
- Fraud detection
- Moderation reports

### Database (Prisma ORM)

**Prisma Schema** (`prisma/schema.prisma`)
- User management with verification status
- Products with category and payment options
- Orders with full lifecycle
- Review system
- Seller profiles
- Messaging threads
- Wishlist items
- Sessions and notifications
- Dispute tracking
- Audit logging

### Frontend State Management

#### **Zustand Stores** (`src/store/store.js`)
- `useAuthStore`: Authentication and user state
- `useProductStore`: Products with filtering
- `useCartStore`: Shopping cart with totals
- `useOrderStore`: User orders
- `useMessageStore`: Messaging threads
- `useSellerStore`: Seller dashboard
- `useUIStore`: Theme and notifications
- `useWishlistStore`: Wishlist
- `useRecentlyViewedStore`: Product history

#### **Custom API Hooks** (`src/hooks/useApi.js`)
- `useApi`: Authenticated fetch with auto-refresh
- `useProducts`: Product operations
- `useOrders`: Order management
- `useAuth`: Authentication
- `useProfile`: User profile
- `useMessages`: Messaging
- `useCheckout`: Payment processing

### Frontend Components

- **Navbar.jsx**: Navigation with search, notifications, auth
- **ProductCard.jsx**: Reusable product display with wishlist
- **Cart.jsx**: Shopping cart with checkout
- **App.jsx**: Refactored main component using stores

### API Documentation

- **Swagger/OpenAPI**: Available at `/api-docs` in development
- Comprehensive endpoint documentation
- Bearer token authentication examples
- Response schema examples

### Admin Features

**Admin Routes** (`routes/admin.js`):
- `GET /api/admin/stats`: Platform statistics
- `POST /api/admin/users/{userId}/suspend`: Suspend user
- `POST /api/admin/users/{userId}/ban`: Ban user
- `POST /api/admin/products/{productId}/flag`: Flag product
- `POST /api/admin/products/{productId}/remove`: Remove product
- `GET /api/admin/flagged-products`: List flagged products
- `GET /api/admin/disputes`: List disputes
- `POST /api/admin/disputes/{disputeId}/resolve`: Resolve dispute
- `GET /api/admin/suspicious-activities`: Detect fraud
- `GET /api/admin/reports`: Generate moderation reports

### Testing

- **Jest Configuration**: `jest.config.js`
- **Example Tests**: `__tests__/auth.test.js`
- Coverage thresholds: 50% minimum
- Test setup and helpers

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci-cd.yml`):
- Automated linting and testing
- Security scanning with Trivy
- Docker image building
- Staging and production deployments

## 📋 Configuration

### Environment Variables

Create `.env` from `.env.example`:

```bash
# Backend
PORT=3000
NODE_ENV=development
DATABASE_URL=satoshi-stop.db

# Auth
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM_NAME=Satoshi Stop
EMAIL_FROM_ADDRESS=noreply@satoshi-stop.com

# Web3
WALLET_PRIVATE_KEY=your_private_key
RPC_URL=https://mainnet.infura.io/v3/your_key
ESCROW_CONTRACT_ADDRESS=0x...

# Cache
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20+
- SQLite3
- Redis (optional, uses memory cache if unavailable)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Initialize database with Prisma
npx prisma migrate dev --name init

# Start development server
npm run dev

# Run tests
npm test

# API Documentation
# Visit: http://localhost:3000/api-docs
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Docker Setup

```bash
# Build and run
docker-compose up -d

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
# API Docs: http://localhost:3000/api-docs
```

## 📊 Architecture Improvements

### Before
- 60+ useState hooks in App.jsx
- Inline fetch calls throughout components
- No centralized state management
- Basic error handling
- No input validation
- No rate limiting
- No advanced logging

### After
- Centralized Zustand stores
- Custom React hooks for API calls
- Composable components
- Comprehensive error classes
- Joi schema validation
- Rate limiting middleware
- Winston logging system
- Email service integration
- Web3 service
- Admin moderation tools
- Prisma ORM
- Redis caching with fallback
- JWT authentication
- Swagger documentation
- CI/CD pipeline

## 🔒 Security Features

✅ **Helmet.js** - HTTP security headers
✅ **Rate Limiting** - DDoS protection
✅ **Input Sanitization** - XSS prevention
✅ **Validation** - Schema-based validation
✅ **CORS** - Cross-origin protection
✅ **JWT** - Token-based authentication
✅ **Password Hashing** - bcryptjs
✅ **Error Handling** - No sensitive info leakage
✅ **Logging** - Audit trail
✅ **Admin Tools** - Moderation and fraud detection

## 🚀 Performance Optimizations

- Redis caching with memory fallback
- Pagination with limit/offset
- Query optimization
- Rate limiting
- Compression middleware
- Lazy component loading

## 📈 Monitoring & Health Checks

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Response:
{
  "status": "ok",
  "timestamp": "2024-04-12T10:30:00Z",
  "uptime": 3600,
  "environment": "development"
}
```

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Coverage report
npm test -- --coverage
```

## 📚 API Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "username": "user123"
  }'
```

### Create Product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bitcoin Hardware Wallet",
    "description": "Secure hardware wallet for Bitcoin",
    "price": 99.99,
    "category": "electronics",
    "stock": 50,
    "isBitcoinAccepted": true
  }'
```

### Place Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId": 1, "quantity": 2}
    ],
    "shippingAddress": "123 Main St, City, State 12345",
    "paymentMethod": "bitcoin"
  }'
```

## 🔧 Common Tasks

### Add a New Admin
```javascript
// In database or through admin panel
INSERT INTO users (email, username, role, isAdmin)
VALUES ('admin@example.com', 'admin', 'admin', 1);
```

### Suspend a User
```bash
curl -X POST http://localhost:3000/api/admin/users/123/suspend \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Fraudulent activity detected",
    "duration": 30
  }'
```

### Generate Moderation Report
```bash
curl "http://localhost:3000/api/admin/reports?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 📦 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Update all environment variables
- [ ] Enable HTTPS
- [ ] Configure Redis for caching
- [ ] Set up email service
- [ ] Configure Web3 RPC endpoint
- [ ] Set up database backups
- [ ] Enable error tracking (Sentry, etc.)
- [ ] Configure logging aggregation
- [ ] Run security audit

## 🆘 Troubleshooting

### Redis Connection Failed
- Falls back to memory cache automatically
- Set REDIS_URL in .env to enable Redis

### Email Not Sending
- Check EMAIL_USER and EMAIL_PASSWORD
- For Gmail, use app-specific password
- Enable "Less secure apps" or use OAuth

### Database Locked
- SQLite has concurrency limits
- Consider migrating to PostgreSQL for production

### Rate Limit Too Strict
- Adjust RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_REQUESTS in .env

## 📞 Support

For issues or questions, please create a GitHub issue with:
- Step to reproduce
- Expected behavior
- Actual behavior
- Environment details

## 📄 License

MIT

## 🙏 Contributors

SatoshiStop Team

---

**Last Updated**: April 12, 2024
**Version**: 2.0.0
