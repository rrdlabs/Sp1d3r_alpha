# D31337m3

**The Decentralized Privacy Management & Crawling Search Platform**

[Whitepaper](WHITEPAPER.md) · [API Docs](microservices/sp1d3r/openapi.yaml) · [Changelog](CHANGELOG.md)

---

## What is D31337m3?

D31337m3 is a privacy-first decentralized search and communication platform. Users own their keys, run their own nodes, and communicate through encrypted channels — no central authority required.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Nginx (TLS)                        │
│  d31337m3.com · admin.d31337m3.com · mobile.d31337m3.com │
└─────────┬──────────┬──────────┬─────────────────────┘
          │          │          │
    ┌─────▼──┐ ┌─────▼──┐ ┌────▼───┐
    │Desktop │ │Mobile  │ │Mobile  │
    │Frontend│ │Admin   │ │User    │
    └────┬───┘ └────┬───┘ └────┬───┘
         │          │          │
    ┌────▼──────────▼──────────▼────┐
    │        Microservices          │
    │  CityHall · Sp1d3r · Director │
    │  Banker · Historian · Lawyer  │
    │  Inboxer · Picaso · Spiderwire│
    └───────────────┬───────────────┘
                    │
    ┌───────────────▼───────────────┐
    │   PostgreSQL · SQLite · Redis  │
    │        Chain State (JSON)      │
    └───────────────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **CityHall** | 8000 | Auth, onboarding, broker management, PEX |
| **Sp1d3r** | 9000 | Search engine, chain, P2P protocol |
| **Director** | 8400 | Node orchestration, task assignment |
| **Banker** | 8700 | Subscriptions, payments (Stripe) |
| **Historian** | 8100 | Content archival |
| **Lawyer** | 8200 | Document processing |
| **Inboxer** | 8300 | Encrypted inbox |
| **Picaso** | 8500 | Content processing |
| **Spiderwire** | 8600 | P2P networking |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL
- pm2 (`npm install -g pm2`)
- Docker (for node agents)

### Local Development

```bash
cd microservices

# CityHall
cd cityhall
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn app.main:app --port 8000

# Sp1d3r
cd ../sp1d3r
python3 app.py

# Director
cd ../director
python3 app.py
```

### Production (pm2)

```bash
cd microservices
pm2 start ecosystem.config.js
pm2 save
```

### Running a Node Agent

```bash
cd microservices/docker
docker compose up -d --build
```

## Environment Variables

See `microservices/cityhall/.env.example` for a full template.

Key variables:

```bash
# CityHall
CITYHALL_DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/dbname
CITYHALL_JWT_SECRET_KEY=your-secret-key
CITYHALL_INTERNAL_API_KEY=your-internal-key

# Node Agent
CITYHALL_URL=http://127.0.0.1:8000
SP1D3R_URL=http://127.0.0.1:9000
DIRECTOR_URL=http://127.0.0.1:8400
```

## Frontends

Three separate frontends, each deployed independently:

- **Desktop** (`d31337m3.com`): Full-featured search, chat, admin panels
- **Mobile Admin** (`admin.d31337m3.com`): Admin dashboard for mobile
- **Mobile** (`mobile.d31337m3.com`): User-facing mobile app with PWA

```bash
cd frontends/sp1d3r.d31337m3.com
npm install && npm run build
# Deploy dist/ to nginx
```

## Cryptography

- **Ed25519**: Message signing, node authentication
- **X25519**: Key agreement (PEX), browser-native WebCrypto
- **JWT**: Session tokens (24h expiry)
- **TLS**: All external traffic encrypted via nginx

## Deployment

Production runs on Azure with:

- pm2 for process management
- nginx for TLS termination and reverse proxy
- Docker for node agents
- PostgreSQL for persistent storage

## License

Private — D31337m3 / rrdlabs. See repository for license terms.

---

**Version 0.5.0** — Official Public Beta
