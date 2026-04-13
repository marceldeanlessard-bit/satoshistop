# SatoshiStop Development Quick Reference

## 🎯 Quick Start (5 minutes)

```bash
# 1. Install
cd backend && npm install
cd ../frontend && npm install

# 2. Configure
cp ../.env.example ../.env
# Edit .env with your settings

# 3. Setup database
cd backend && npx prisma migrate dev

# 4. Run
# Terminal 1
cd backend && npm run dev

# Terminal 2  
cd frontend && npm run dev

# Open http://localhost:5173 and http://localhost:3000/api-docs
```

---

## 📁 File Structure Reference

```
backend/
├── middleware/
│   ├── auth.js              # Authentication & RBAC
│   ├── errors.js            # Custom error classes
│   ├── errorHandler.js      # Global error handler
│   ├── helpers.js           # Utility functions
│   ├── logger.js            # Winston logging
│   ├── security.js          # Helmet, rate limit, sanitize
│   └── validators.js        # Joi schemas
├── services/
│   ├── adminService.js      # Moderation & fraud detection
│   ├── cacheService.js      # Redis cache
│   ├── emailService.js      # Email templates
│   └── web3Service.js       # Blockchain operations
├── routes/
│   ├── admin.js             # Admin endpoints
│   └── ...                  # Other route modules
├── config/
│   └── swagger.js           # API documentation
├── prisma/
│   └── schema.prisma        # Database models
└── __tests__/
    └── auth.test.js         # Example tests

frontend/
├── src/
│   ├── store/
│   │   └── store.js         # Zustand stores (9 shops)
│   ├── hooks/
│   │   └── useApi.js        # API hooks
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── ProductCard.jsx
│   │   ├── Cart.jsx
│   │   └── ...
│   └── App.jsx              # Main component (refactored)
```

---

## 🔑 Key Concepts

### State Management
```javascript
// OLD: 60+ useState in App.jsx
const [cart, setCart] = useState([]);
const [auth, setAuth] = useState(null);
// ... 58 more

// NEW: Clean stores
import { useCartStore, useAuthStore } from './store/store';
const { items, addToCart } = useCartStore((state) => ({...}));
const { user, token } = useAuthStore();
```

### API Calls
```javascript
// OLD: Inline fetch with token management
const data = await fetch('/api/products', {
  headers: { Authorization: `Bearer ${token}` }
});

// NEW: Custom hooks with auto-refresh
const { fetchProducts } = useProducts();
const data = await fetchProducts();
```

### Error Handling
```javascript
// OLD: Console.log, generic responses
try {
  // something
} catch (err) {
  console.error(err);
  res.json({ error: err.message });
}

// NEW: Proper error classes
throw new ValidationError('Invalid email', { field: 'email' });
throw new AuthorizationError('Admin access required');
```

### Security
```javascript
// OLD: No rate limiting, no validation
app.post('/api/auth/login', (req, res) => {
  // Direct DB query
});

// NEW: Layered with validation, rate limit, sanitization
app.post('/api/auth/login',
  limiters.auth,              // Rate limiting
  sanitizeInput,              // XSS prevention
  validate(schemas.auth.login), // Input validation
  verifyToken,                // Auth check
  asyncHandler(handler)       // Error handling
);
```

---

## 🚀 Common Operations

### Create a New API Endpoint

1. **Define validation schema** in `middleware/validators.js`
2. **Create route handler** in `routes/your-module.js`
3. **Add necessary middleware** (auth, validation, rate limit)
4. **Add error handling** with `asyncHandler`

```javascript
// Example
router.post('/products',
  verifyToken,
  requireSeller,
  sanitizeInput,
  validate(schemas.product.create),
  asyncHandler(async (req, res) => {
    const product = await createProduct(req.validatedData);
    res.status(201).json(product);
  })
);
```

### Add a React Component

1. Create in `src/components/MyComponent.jsx`
2. Use Zustand stores for state
3. Use custom hooks for API calls
4. Export and use in App

```javascript
// src/components/MyComponent.jsx
import { useCartStore } from '../store/store';
import { useProducts } from '../hooks/useApi';

export function MyComponent() {
  const { items, addToCart } = useCartStore();
  const { fetchProducts } = useProducts();
  
  // Use stores directly - no prop drilling
  return <div>{/* JSX */}</div>;
}
```

### Add Email Template

1. Create method in `services/emailService.js`
2. Define HTML template
3. Call with transporter.sendMail()

```javascript
const sendCustomEmail = async (email, data) => {
  const html = `<h1>${data.title}</h1>`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM_ADDRESS,
    to: email,
    subject: data.title,
    html
  });
};
```

### Add Database Model

1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add_feature`
3. Use in code with Prisma client

```javascript
// prisma/schema.prisma
model MyModel {
  id    Int     @id @default(autoincrement())
  name  String
  createdAt DateTime @default(now())
}

// In code
const result = await prisma.myModel.create({ data: { name } });
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific test
npm test -- auth.test.js
```

### Test Template
```javascript
describe('MyFeature', () => {
  it('should do something', async () => {
    const result = await myFunction();
    expect(result).toBe(expected);
  });
});
```

---

## 🔍 Debugging

```javascript
// Backend logging
const logger = require('./middleware/logger');
logger.info('Info message');
logger.error('Error message', error);
logger.warn('Warning message');
logger.debug('Debug message');

// Check logs
tail -f logs/app.log
tail -f logs/error.log
```

---

## 📊 Monitoring

```bash
# Health check
curl http://localhost:3000/api/health

# API Documentation
http://localhost:3000/api-docs

# Admin Dashboard (coming soon)
```

---

## ⚙️ Environment Variables (Key Ones)

```bash
# Auth
JWT_SECRET=change-me-in-production
TOKEN_EXPIRY=15m

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Web3
WALLET_PRIVATE_KEY=0x...
RPC_URL=https://mainnet.infura.io/v3/your-key

# Cache
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Redis not connecting | Check REDIS_URL or remove to use memory cache |
| Email not working | Use app-specific password for Gmail, check EMAIL_USER |
| Database locked | SQLite limitation, migrate to PostgreSQL for production |
| Rate limit too strict | Increase RATE_LIMIT_MAX_REQUESTS in .env |
| Token not refreshing | Check REFRESH_TOKEN_EXPIRY and token logic |
| CORS errors | Whitelist origin in middleware/security.js corsOptions |
| Tests failing | Check DATABASE_URL and ensure migrations ran |

---

## 📚 Learn More

- **Backend**: See `IMPLEMENTATION_GUIDE.md`
- **Frontend Architecture**: Check `src/store/store.js` for all stores
- **API Docs**: Visit `/api-docs` endpoint
- **Error Handling**: Review `middleware/errors.js`
- **Validation**: Check `middleware/validators.js`

---

## 🚀 Production Deployment

```bash
# Build
npm run build (frontend)

# Environment
NODE_ENV=production

# Database
npx prisma migrate deploy

# Start
npm start

# Monitor
curl http://your-domain.com/api/health
```

---

## 💡 Pro Tips

1. **Always use `asyncHandler`** when creating route handlers
2. **Use Zustand stores** instead of context/Redux
3. **Validate input** with Joi schemas before processing
4. **Log important events** for debugging production issues
5. **Use custom errors** for proper error responses
6. **Check permissions** with `verifyToken, requireRole`
7. **Cache frequently accessed data** to reduce DB queries
8. **Monitor rate limits** for suspicious activity
9. **Test edge cases** not just happy paths
10. **Keep components small** and use custom hooks

---

**Last Updated**: April 12, 2026  
**Version**: 2.0.0
