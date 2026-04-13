# Phase 5: Production Deploy 🚀 [0/5]

## Current Status
Phases 1-4 ✅ COMPLETE (Backend, Frontend PWA, Security, CI/CD, Monitoring)

Repo: https://github.com/marceldeanlessard-bit/satoshistop (blackboxai/phase4-cicd branch)

Docker stack healthy on localhost.

## Phase 5 Steps
1. [ ] **Create main branch**
   - `git checkout -b main`
   - `git push -u origin main`
   - Merge PR: `gh pr create --title \"Production Ready Phase 4\" --base main`

2. [ ] **VPS Setup (DigitalOcean/Linode $6/mo Ubuntu 22.04)**
   - Create droplet/VM
   - SSH setup, firewall ufw
   - Install Docker: `curl -fsSL https://get.docker.com | sh`

3. [ ] **Deploy to VPS**
   ```
   git clone https://github.com/marceldeanlessard-bit/satoshistop.git
   cd satoshistop
   git checkout main
   cp .env.example .env
   # Set secrets: DATABASE_URL, JWT_SECRET, SENTRY_DSN, etc.
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. [ ] **Domain/SSL (Let's Encrypt)**
   - Point A record to VPS IP
   - Certbot: `sudo apt install certbot nginx; sudo certbot --nginx`

5. [ ] **Production Verification**
   - Lighthouse audit: 90+ score
   - Load testing, monitoring
   - Update README with live URL

**Run on VPS:** `docker-compose -f docker-compose.prod.yml logs -f`

**Next:** Execute Step 1 (main branch), then VPS provision.

