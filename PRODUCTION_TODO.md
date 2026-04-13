# Phase 5: Production Deploy 🚀

## Prerequisites
- Repo: https://github.com/marceldeanlessard-bit/satoshistop
- Docker stack healthy (tested)

## Steps
1. VPS (DigitalOcean $6/mo droplet Ubuntu 22.04)
2. Install Docker/Docker Compose: `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER`
3. Git clone & docker-compose.prod up
4. Domain/SSL
5. Migrate to main: `gh pr create --title "Merge Phase 4 to main" --base main`

**Phase 4 TODO.md continued & completed!**
