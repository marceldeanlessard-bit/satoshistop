# Production Readiness Plan for SatoshiStop Marketplace

## Information Gathered:
**Project Structure**: Monorepo (workspaces: backend Node/Express/SQLite/Prisma, frontend Vite/React/Tailwind/Zustand/RadixUI/Web3).
**Backend**: Rate limiting, helmet, auth middleware, SQLite (dev), docker-compose.yml exists.
**Frontend**: PWA configured (vite-plugin-pwa), proxy to backend, workbox caching, offline.html.
**Current Issues**: Cart API 404, TODO_backend_cleanup.md pending Phase 5 testing.
**Production Status**: Dev-ready (local dev works), needs hardening.

## Plan:

### Phase 1: Backend Production
1. Complete TODO_backend_cleanup.md Phase 5 (test server, jest).
2. Fix cart API `/checkout/cart` - make GET return proper cart or mock for demo.
3. Add .env.prod.example, env validation.
4. PostgreSQL migration (prod DB), Prisma push.
5. HTTPS (nginx proxy), Redis (cache/sessions).

### Phase 2: Frontend Production
1. Add manifest.json to public/, PWA icons if missing.
2. Env vars validation, VITE_API_URL=https://api.example.com.
3. Error boundaries, Sentry integration.
4. Bundle analysis, compression.

### Phase 3: Security & Performance
1. Backend: JWT secrets rotation, CORS prod, helmet strict.
2. Frontend: CSP headers, secure cookies.
3. Monitoring: Winston structured logs, health checks.

### Phase 4: Deployment
1. Update docker-compose.prod.yml (nginx, postgres, redis).
2. CI/CD GitHub Actions (lint/test/build/deploy).
3. Vercel/Netlify frontend, Railway/DigitalOcean backend or Docker.

**Dependent Files**: package.json(s), docker-compose.yml, vite.config.js, server.js, .env.
**Followup**: Create/update Dockerfiles, .env.example, GitHub Actions.

Confirm this plan before implementing?

