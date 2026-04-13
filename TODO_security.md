# Security Hardening TODO (backend/middleware/security.js Fix)

## Plan Steps (Approved)

- [x] **Step 1: Install dependencies** ✅
  - cd backend && npm install csurf express-validator ioredis rate-limit-redis
  - Verify backend/package.json updated (csurf, express-validator, ioredis added; redis/rate-limit-redis present)

- [x] **Step 2: Fix & Harden backend/middleware/security.js** ✅
  - Fix sanitizeInput syntax errors (regex, entity map) ✅
  - Update Redis client to modern ioredis/async ✅
  - Harden CSP (remove unsafe-inline, add prod origins/connect-src) ✅
  - Add CSRF middleware export ✅
  - Add express-validator input ✅
  - Add composite applySecurity(app) function ✅
  - Export all updated ✅

- [ ] **Step 3: Update backend/server.js**
  - Use applySecurity(app)
  - Add CSRF protection to state-changing routes (POST/PUT/DELETE)
  - Align auth (verifyJWT vs verifyToken)
  - Lower prod body limits if not set

- [ ] **Step 4: Environment & Testing**
  - Update .env.example with new vars (ALLOWED_ORIGINS, REDIS_URL)
  - Test server start: npm run dev
  - Test rate limits, CSP headers (curl -I localhost:3000/api/health)
  - Security headers scan: securityheaders.com or lighthouse
  - Docker prod test: docker-compose up

- [ ] **Step 5: Complete**
  - Update SECURITY_HARDENING.md ✅
  - Remove this TODO.md

**Current Progress: Starting Step 1**

