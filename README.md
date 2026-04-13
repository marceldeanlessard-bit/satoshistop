# Satoshi Stop

A lightweight marketplace prototype for crypto commerce, built with an Express backend and a React + Vite frontend.

## Project structure

- `backend/` - Node/Express API server
- `frontend/` - React frontend with Vite
- `docker-compose.yml` - local development compose setup

## Getting started

### Install dependencies

From the root:

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open the frontend at `http://localhost:5173`.

### Run backend only

```bash
cd backend
npm install
npm run dev
```

Backend API endpoints are available at `http://localhost:3000/api/*`.

### Run frontend only

```bash
cd frontend
npm install
npm run dev
```

### Build frontend

```bash
cd frontend
npm run build
```

## Notes

- The backend currently includes stub routes for auth, products, orders, profile, reputation, escrow, subscriptions, NFT, analytics, referral, notifications, and governance.
- Use `.env.example` as a starting point for environment variables.
