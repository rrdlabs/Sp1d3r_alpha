    <a
    id="cy-effective-orcid-url"
    class="underline"
     href="https://orcid.org/0009-0004-0440-056X"
     target="orcid.widget"
     rel="me noopener noreferrer"
     style="vertical-align: top">
     <img
        src="https://orcid.org/sites/default/files/images/orcid_16x16.png"
        style="width: 1em; margin-inline-start: 0.5em"
        alt="ORCID iD icon"/>
      https://orcid.org/0009-0004-0440-056X
    </a>

# D31337m3 (Pronouced: Delete Me) Privacy and Online reputation Management SaaS Platform

**d31337m3** is an advanced SaaS platform that combines a **privacy and reputation management web app with distributed crawler/scraper network** with a custom **Proof-of-Authority AppChain (blockchain)**for securing user data and immutable proof of takedown notice delivery, and identity verification, an **onboarding/user management gateway** and a automated Legal document Generation with signature signing microservice. It scrapes data from web data brokers,search engine indexes (Google, Bing, Yahoo etc), based on users entered profile data in addition to users selected custom keywords, encrypts findings client-side (E2EE) to further protect users, writing only the cryptographic hashes that secured the data to the blockchain, and provides identity, secure messaging, legal document generation and signing, and the frontend UI services.

> **Status: ALPHA** — unstable, incomplete, not production-ready.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           d31337m3 SaaS Platform                            │
├────────────┬──────────┬──────────┬────────┬─────────┬──────────┬───────────┤
│  CityHall  │ Director │ Historian│ Lawyer │ Inboxer │  Picaso  │  Sp1d3r   │
│ (8000)     │ (8400)   │ (8100)   │ (8200) │ (8300)  │ (8500)   │ (9000)    │
│  Onboarding │  Orch.   │  SOR     │ Legal  │ Msging  │ UI/UX    │ Chain +   │
│  Gateway    │          │  Store   │  Docs   │  SMTP   │  Delivery│ Crawler   │
├────────────┴──────────┴──────────┴────────┴─────────┴──────────┴───────────┤
│                           Spiderwire (8600)                                 │
│                     Networking & Identity Fabric                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                           React Frontend (sp1d3r.d31337m3.com)              │
│                    API test panel for crawl + health checks                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Features

### ✅ Implemented (from source)

**Identity & Access (CityHall) — FastAPI + PostgreSQL**
- User registration with Ed25519 keypair generation and referral codes
- Password & cryptographic key-based authentication (JWT HS256)
- Role-based access control: `user`, `nodeop`, `tech_op`, `chat_op`, `admin`, `super_admin`
- Admin user management: list, search, update, delete with pagination
- Wallet address linking per user
- Audit logging on auth events

**Crawler & Blockchain Engine (Sp1d3r) — Python, Ed25519, SHA-256, Merkle**
- Custom Proof-of-Authority AppChain with compact binary transaction format (212 bytes/tx)
- Three transaction types: `NODE_AUTH` (0x01), `APP_SIG_VERIFY` (0x02), `PAYLOAD_COMMIT` (0x03)
- Ed25519 digital signatures with full verification
- Merkle tree for payload root commitment
- PII detection and alert system notifiying user when their info is discovered online and onchain.
- X25519 + AES-256-GCM end-to-end encryption for crawler payloads
- Binary hash self-check / quarantine enforcement
- Atomic config writes via `fsync()`-guaranteed writes
- 6 passing unit tests covering chain state, encryption, and config

**Service Orchestration (Director)**
- Service registry (CRUD), health tracking, heartbeat monitoring
- Automatic restart reconciliation on failure threshold breach
- Traffic/alert logging

**System of Record (Historian)**
- Encrypted-at-rest JSON key-value store (hex-based "encryption")
- Template and broker data management for document generation

**Legal Document Generation (Lawyer)**
- Fetches templates from Historian, fills with the offending broker and violating data via Python `str.format()`
- Generates filled documents with `[digital-signature]` placeholder and required user info
- Makes available a completed, signed pdf copy for user download/print etc.
- If enabled submits a signed copy to the offending broker electronically via email, POST, FAX etc.
- Prepares escalation documents if offeding item isnt removed within reasonable time frames.
- Covers legal documents from all of North America including, Canada, U.S.A, Mexico. With some of these countires smaller
  state/provincial/county regions being covered under aternate/modified compliancy laws.
- Strives to be Legal and Fully Qualifying to be legally binding within covered jurisdictions and remaining compliant to
  covered jusidictions privacy laws.

**Messaging & SMTP (Inboxer)**
- SQLite-backed persistent channel-based, internal(staff chat) interstaff/inter-departmental messaging, as
  well as providing the infra for active 24/7 online Technical support chat with customers and support staff. Including
  ability to create / close / review and link service tickets to customers progiles stored in cityhall db. Closeing the human-in-the-loop support system.  
- Outbound SMTP mail delivery with support@d31337m3.com default sender output with provider-agnostic queuing, and OTP pin genratiom/sending for 2fa, and email address verification during onboardimg.

**UI Delivery (Picaso)**
- Static frontend react spa app serving and file upload(admin panel uploads, user screenshots, broker csv updates etc) management
- Traffic reporting back to Director, allowimg usage metrics per user/region/etc
- Self-health monitoring with auto-restart logic for all assigned from end serves.
- lite nginx implementation/configuration built in, and automatic certbot ssl cert install and renewals.

**Networking (Spiderwire)**
- Health endpoint + presence detection, anti-ddos, firewallimg, blacklisting of ips etc.     

**Frontend (React 19 + TypeScript 6 + Vite 8)**
- Sp1d3r API test panel: health check and crawl test submission(we be reverted to uiless api only at launch/or admin gated)
- Configurable API base URL and auth token

### 🚧 Missing / Incomplete
- **Missing user/admin faceing UI/Frontend react apps**: must implement these asap to finish workload flow testing.
- **Sp1d3r microservice wrapper**: `POST /v1/crawl` is a stub — accepts URLs but does not invoke the crawler (MUST IMPLEMENT engine)
- **Crawler engine** (`d31337m3_crawler`): anti-fingerprinting wrapper not wired; no async gateway for task routing
- **No durable encrypted ciphertext storage** for crawler findings IS in-memory only(IMPLEMENT FULL BLOCKCHAIN FUNC.)
- **Spiderwire**: only a placeholder — no real networking fabric - may get absorbed by other services.
- **No CI/CD**, no Kubernetes(CONSIDERING) manifests, no Infisical(IMPLEMENTING ASAP) secrets integration (env vars only)
- **No blockchain persistence** — chain state is in-memory only (URGENT TODO ITEM)

---

## Quick Start

```bash
# All microservices (7 containers)
cd d31337m3/microservices
docker compose up --build

# CityHall onboarding gateway (PostgreSQL + FastAPI)
cd d31337m3/microservices/cityhall
docker compose up --build

# Frontend (standalone dev server)
cd d31337m3/frontends/sp1d3r.d31337m3.com
npm install && npm run dev
```

---

## Roadmap

| Area | Short-term | Medium-term |
|------|-----------|-------------|
| **Chain** | Persist chain state to disk; wire `/v1/crawl` to real crawler engine | CLI entry point for self-check; async gateway for task routing |
| **Crawler** | Connect anti-fingerprinting wrapper; durable ciphertext storage | Volunteer node protocol; distributed task queue |
| **CityHall** | Unit tests with `TestClient`; rate limiting; email verification | OAuth2/OIDC federation; MFA |
| **Networking** | Replace Spiderwire stub with real P2P/gossip fabric | Bluetooth transport |
| **Infrastructure** | CI/CD pipeline; Infisical secrets management; Kubernetes manifests | Multi-region deployment |
| **Code quality** | Deduplicate Sp1d3r source; add `node_modules`/`dist` to `.gitignore` | TypeScript strict mode; Python type coverage |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Custom Python — Ed25519, SHA-256, Merkle, PoA |
| Microservices | Python 3.12, `http.server.ThreadingHTTPServer` |
| Onboarding Gateway | FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL 16 |
| Messaging | SQLite, SMTP (stdlib `smtplib`) |
| Frontend | React 19.2, TypeScript 6.0, Vite 8.1, Oxlint |
| Crypto | `cryptography` — Ed25519, X25519, AES-256-GCM, HKDF |
| Containerization | Docker, docker-compose (all services) |

---

<details>
<summary><b>🧑‍💻 Developer Details — Service Endpoints & Configuration</b></summary>

### Service Endpoints

#### Director (port 8400)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health + service count |
| GET | `/services` | List all registered services |
| GET | `/services/{name}` | Get service details |
| GET | `/traffic/frontend` | Frontend traffic stats |
| GET | `/alerts` | Service alerts |
| POST | `/services` | Register/update service |
| POST | `/services/{name}/heartbeat` | Service heartbeat |
| POST | `/services/{name}/health` | Report health status |
| POST | `/services/{name}/alert` | Raise alert |
| POST | `/traffic/frontend` | Report traffic |
| POST | `/reconcile` | Auto-restart unhealthy services |

#### Historian (port 8100)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health |
| GET | `/records/{key}` | Get encrypted record |
| GET | `/templates/{name}` | Get document template |
| GET | `/brokers/{name}` | Get broker data rows |
| POST | `/records` | Store encrypted record |
| POST | `/broker-import` | Import broker data |
| POST | `/templates` | Store template |

#### Lawyer (port 8200)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health |
| POST | `/documents/generate` | Generate document from template + broker data |

#### Inboxer (port 8300)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health |
| GET | `/messages?channel=...` | List messages (optional channel filter) |
| POST | `/messages` | Send message |
| POST | `/mail` | Send SMTP email |

#### Picaso (port 8500)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health + restart/failure stats |
| GET | `/` or `/frontends` | List frontends |
| GET | `/frontends/{path}` | Serve static file |
| POST | `/uploads` | Upload frontend file |
| POST | `/health/report` | Health report (triggers auto-restart) |
| POST | `/restart` | Restart service |

#### Sp1d3r (port 9000)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health |
| POST | `/v1/crawl` | Submit crawl URLs (returns task ID) |

#### Spiderwire (port 8600)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health |
| POST | `/presence` | Record presence |

#### CityHall (port 8000 — FastAPI, Swagger at `/docs`)
See `d31337m3/microservices/cityhall/app/routers/` for full routes. Key groups:
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- `GET /auth/challenge`, `POST /auth/authenticate-with-key`
- `GET /users/me`, `PUT /users/me`
- `POST /users/me/generate-keypair`, `GET /users/me/public-key`, `POST /users/me/link-wallet`
- `GET /admin/users`, `GET /admin/users/search`, admin CRUD by ID

### Environment Variables

| Variable | Default | Service |
|----------|---------|---------|
| `DIRECTOR_PORT` | `8400` | Director |
| `DIRECTOR_DATA_DIR` | `/tmp/director-data` | Director |
| `DIRECTOR_RESTART_THRESHOLD` | `2` | Director |
| `HISTORIAN_PORT` | `8100` | Historian |
| `HISTORIAN_DATA_DIR` | `/tmp/historian-data` | Historian |
| `HISTORIAN_ENCRYPTION_KEY` | `dev-only-key` | Historian |
| `LAWYER_PORT` | `8200` | Lawyer |
| `HISTORIAN_URL` | `http://127.0.0.1:8100` | Lawyer |
| `INBOXER_PORT` | `8300` | Inboxer |
| `INBOXER_DATA_DIR` | `/tmp/inboxer-data` | Inboxer |
| `INBOXER_SMTP_HOST` | `localhost` | Inboxer |
| `INBOXER_SMTP_PORT` | `25` | Inboxer |
| `INBOXER_SMTP_FROM` | `no-reply@example.com` | Inboxer |
| `PICASO_PORT` | `8500` | Picaso |
| `PICASO_DATA_DIR` | `/tmp/picaso-data` | Picaso |
| `DIRECTOR_URL` | `http://127.0.0.1:8400` | Picaso, Sp1d3r, Spiderwire |
| `PICASO_RESTART_THRESHOLD` | `2` | Picaso |
| `SP1D3R_PORT` | `9000` | Sp1d3r |
| `SP1D3R_HOST` | `0.0.0.0` | Sp1d3r |
| `SPIDERWIRE_PORT` | `8600` | Spiderwire |
| `CITYHALL_DATABASE_URL` | `postgresql+asyncpg://cityhall:cityhall@localhost:5432/cityhall` | CityHall |
| `CITYHALL_JWT_SECRET_KEY` | `cityhall-dev-secret-key-change-in-production` | CityHall |

### Testing

```bash
# Sp1d3r blockchain engine tests (6 tests)
cd d31337m3/microservices/sp1d3r
python -m unittest discover -s tests
```

CityHall does not yet have automated tests. Browse API docs at `http://localhost:8000/docs` when running.

### Project Structure

```
d31337m3/
├── frontends/sp1d3r.d31337m3.com/   React 19 + Vite 8 frontend
├── microservices/
│   ├── cityhall/                     FastAPI onboarding gateway
│   │   ├── app/
│   │   │   ├── main.py, config.py, models.py, database.py
│   │   │   ├── auth.py, blockchain.py, schemas.py
│   │   │   └── routers/  (auth, users, admin)
│   │   ├── migrations/               Alembic
│   │   └── docker-compose.yml        PostgreSQL + CityHall
│   ├── director/                     Orchestrator
│   ├── historian/                    Encrypted record store
│   ├── inboxer/                      Messaging + SMTP
│   ├── lawyer/                       Document generation
│   ├── picaso/                       UI delivery
│   ├── sp1d3r/                       Blockchain + crawler
│   │   ├── src/d31337m3_chain/       chain.py, transaction.py, crypto.py, merkle.py, pii_guard.py
│   │   ├── src/d31337m3_crawler/     worker.py, self_check.py
│   │   ├── src/d31337m3_core/        config.py, orchestrator.py
│   │   └── tests/                    6 passing tests
│   ├── spiderwire/                   Networking stub
│   └── docker-compose.yml            Orchestrates 7 services
└── agents.md                         Service overview docs
```

Sp1d3r source also exists at `/Sp1d3r` (root, embedded git repo) — near-identical copy.

</details>
