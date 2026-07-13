# AGENTS.md — AI Agent Instructions for D31337m3

This file contains instructions for AI agents working on the D31337m3 codebase. Read this before making any changes.

---

## Project Overview

**D31337m3** (pronounced "Delete Me") is a decentralized privacy management and crawling search platform. It combines a distributed crawler network with a custom Proof-of-Authority AppChain, encrypted search, legal document generation, and identity management.

- **D31337m3** = the platform
- **Sp1d3r** = the search engine / crawling workers
- **Nodes** = ESP32 peer devices running firmware for distributed crawling

**Status: ALPHA** — unstable, incomplete, not production-ready.

---

## Repository Structure

```
Sp1d3r_alpha/
├── d31337m3/
│   ├── frontends/
│   │   ├── sp1d3r.d31337m3.com/     Desktop web app (React 19 + Vite 8 + MUI v9)
│   │   ├── mobile.d31337m3.com/     Mobile user PWA (React 19 + Vite + MUI v9 + vite-plugin-pwa)
│   │   └── mobile-admin.d31337m3.com/  Mobile admin PWA
│   ├── microservices/
│   │   ├── ecosystem.config.js       pm2 process manager config
│   │   ├── cityhall/                 Auth, RBAC, users, documents, keywords, reputation (FastAPI + PostgreSQL)
│   │   ├── sp1d3r/                   Blockchain engine + crawler + search API
│   │   ├── director/                 Service orchestration + health monitoring
│   │   ├── historian/                Encrypted record store
│   │   ├── lawyer/                   Legal document generation
│   │   ├── inboxer/                  Messaging + SMTP email
│   │   ├── picaso/                   Frontend delivery
│   │   ├── banker/                   Subscriptions + payments
│   │   └── spiderwire/               Networking fabric (placeholder)
│   └── node-agent/                   ESP32 peer node agent (Docker)
├── Sp1d3r_node_esp32/                ESP32-WROOM firmware with embedded React web UI
├── AGENTS.md                         This file
├── CHANGELOG.md                      Version history
├── README.md                         Project overview
└── TODO.md                           Remaining tasks
```

---

## Running Services

All 9 microservices run under **pm2** (no Docker). PostgreSQL runs in Docker on port 5432.

| Service | Port | Role |
|---------|------|------|
| CityHall | 8000 | Auth, RBAC, users, enrollment, documents, keywords, reputation |
| Historian | 8100 | Encrypted record store, templates, broker data |
| Lawyer | 8200 | Legal document generation |
| Inboxer | 8300 | Messaging, SMTP email, OTP delivery |
| Director | 8400 | Service orchestration, health, node tracking |
| Picaso | 8500 | Frontend delivery, file management |
| Spiderwire | 8600 | Networking (placeholder) |
| Banker | 8700 | Subscriptions, payments (Stripe, Interac, crypto) |
| Sp1d3r | 9000 | Blockchain, crawler engine, search API |

**Data dirs**: `/var/lib/sp1d3r/{service}/`

---

## Server Access

- **Server**: `Trixie-Main`, user `dranger`
- **Sudo password**: `Kronik4life!!2026!!`
- **Super admin**: username `admin`, email `admin@d31337m3.com`, password `Kronik4life!!2026!!`
- **Internal API key**: `d31337m3-internal-key-change-in-production`

---

## Deployment Commands

### Start/restart all services
```bash
pm2 start /home/dranger/Sp1d3r_alpha/d31337m3/microservices/ecosystem.config.js
pm2 restart all
```

### Run database migration
```bash
cd d31337m3/microservices/cityhall && .venv/bin/python -m alembic upgrade head
```

### Build + deploy desktop frontend
```bash
cd d31337m3/frontends/sp1d3r.d31337m3.com && npm run build
echo 'Kronik4life!!2026!!' | sudo -S cp -r dist/* /var/www/html/
```

### Build + deploy mobile user PWA
```bash
cd d31337m3/frontends/mobile.d31337m3.com && npm run build
echo 'Kronik4life!!2026!!' | sudo -S cp -r dist/* /var/www/mobile.d31337m3.com/
```

### Build + deploy mobile admin PWA
```bash
cd d31337m3/frontends/mobile-admin.d31337m3.com && npm run build
echo 'Kronik4life!!2026!!' | sudo -S cp -r dist/* /var/www/mobile-admin.d31337m3.com/
```

### Check service status
```bash
pm2 status
pm2 logs cityhall --lines 20
```

---

## Key Patterns & Conventions

### Backend (CityHall — FastAPI)

- **ORM**: SQLAlchemy async with `Mapped[]` typed columns, `mapped_column()`
- **Schemas**: Pydantic models in `app/schemas.py`
- **Routers**: FastAPI routers in `app/routers/` — `auth.py`, `users.py`, `admin.py`, `signatures.py`, `documents.py`, `keywords.py`, `reputation.py`
- **Auth**: `get_current_user` dependency for JWT auth, `get_session` dependency with auto-commit/rollback
- **Migrations**: Alembic in `d31337m3/microservices/cityhall/migrations/versions/` — numbered `001_` through `012_`
- **Python venv**: `.venv/bin/python` — always use venv Python, not system Python
- **Restart cityhall after changes**: `pm2 restart cityhall`

### Frontend (React + MUI v9)

- **API client**: All frontends use relative paths (`/cityhall`, `/sp1d3r`, etc.) — never `localhost:PORT`
- **MUI v9 patterns**:
  - `sx` prop for all layout (no separate `style` prop)
  - `Grid size={{ xs: ..., md: ... }}` (not `item xs={...}`)
  - `fontWeight` only inside `sx` object (not top-level prop)
  - Use `slotProps` not `inputProps` for TextField
  - Use `slots` not `component` for custom renderers
- **Auth context**: `src/context/AuthContext.tsx` — stores token/userId/username/isAdmin in localStorage
- **Theme**: `src/theme/theme.ts` — dark/light themes with `useTheme()` hook
- **Mobile PWAs**: Use `vite-plugin-pwa@^1.3.0`, `workbox-window@^7.4.1`

### Port Map

`8000`=CityHall, `8100`=Historian, `8200`=Lawyer, `8300`=Inboxer, `8400`=Director, `8500`=Picaso, `8600`=Spiderwire, `8700`=Banker, `9000`=Sp1d3r

All inter-service URLs use `127.0.0.1` (not Docker DNS).

---

## Search & Tier Limits

**Manual/user-triggered searches** (from SearchPanel UI) count towards account limits (trial/subscription). **Automated/system-triggered searches** (keyword monitors, background crawlers) have separate tier-based limits tracked on the User model:

| Tier | System search limit (30-day rolling window) |
|------|---------------------------------------------|
| Free | 100 |
| Starter | 500 |
| Pro | 2,000 |
| Enterprise | 10,000 |

---

## ESP32 Node Firmware

- **Repo**: `/home/dranger/Sp1d3r_node_esp32` (standalone git repo)
- **ESP-IDF**: v5.4.3 at `/home/dranger/esp-idf`
- **Crypto**: SHA-256 HMAC identity (Ed25519 unavailable in mbedTLS 3.6.4)
- **Factory binary**: `sp1d3r_node_esp32_v0.1.0.bin` (1.1MB merged) at `/var/www/html/firmware/`
- **Web Flasher**: `/flash` route on desktop frontend, uses `esptool-js` (WebSerial)

---

## Git Workflow

- Commit messages: `type: description` (e.g., `feat:`, `fix:`, `v0.X.0:`)
- Always `git push origin main` after committing
- Never commit secrets or keys
- Check `git status`, `git diff`, `git log --oneline -10` before committing

---

## Whitepaper Instructions

When creating or updating the D31337m3 whitepaper, follow these guidelines:

### Document Location
- Create at: `d31337m3/WHITEPAPER.md`
- Never overwrite — update in place with version bumps

### Structure
The whitepaper should follow this structure:

```
# D31337m3 Whitepaper
## Abstract
## 1. Introduction — The Privacy Problem
## 2. D31337m3 Architecture Overview
## 3. The Sp1d3r Search Engine
  - 3.1 Encrypted Search Pipeline
  - 3.2 Super Search (Meta-Search)
  - 3.3 Distributed Crawler Network
## 4. Proof-of-Authority AppChain
  - 4.1 Transaction Types (NODE_AUTH, APP_SIG_VERIFY, PAYLOAD_COMMIT)
  - 4.2 Ed25519 Digital Signatures
  - 4.3 Merkle Tree Payload Commitment
  - 4.4 PII Detection & Alerting
## 5. Identity & Access Management (CityHall)
  - 5.1 JWT + Cryptographic Key Authentication
  - 5.2 RBAC Roles
  - 5.3 Ed25519 Keypairs & Seed Phrase Recovery
  - 5.4 Node Enrollment
## 6. End-to-End Encryption
  - 6.1 X25519 Key Agreement
  - 6.2 AES-256-GCM Payload Encryption
  - 6.3 Client-Side Decryption
## 7. Legal Document Generation (Lawyer)
  - 7.1 Template System
  - 7.2 Digital Signatures
  - 7.3 Auto-Submission to Data Brokers
## 8. Subscription & Payment Model (Banker)
  - 8.1 Tier Structure
  - 8.2 Node Operator Free Tier
  - 8.3 Crypto/Stripe/Interac Payments
## 9. ESP32 Crawler Nodes
  - 9.1 Firmware Architecture
  - 9.2 Embedded Web UI
  - 9.3 OTA Updates
## 10. Reputation System
## 11. Keyword Tracking & Monitoring
## 12. Privacy & Security Considerations
## 13. Roadmap
## 14. Conclusion
```

### Writing Guidelines

1. **Audience**: Technical but accessible. Assume readers understand basic cryptography and distributed systems, but explain domain-specific concepts.
2. **Tone**: Professional, authoritative, concise. Avoid marketing fluff.
3. **Diagrams**: Use ASCII/Mermaid diagrams for architecture. Reference `README.md` architecture diagram.
4. **Cryptography**: Explain Ed25519, X25519, AES-256-GCM, SHA-256, PBKDF2, BIP-39 mnemonic derivation in context.
5. **Stats to reference**:
   - Transaction size: 212 bytes/tx
   - 3 transaction types
   - 9 microservices
   - PBKDF2: 200k iterations for seed derivation
   - BIP-39: 12-word mnemonic (128-bit entropy)
6. **Security**: Document threat model, zero-knowledge properties, on-chain vs off-chain data separation.
7. **Comparisons**: Reference existing privacy tools (HaveIBeenPwned, DeleteMe, Privacy.com) and explain differentiation.
8. **Legal**: Note compliance with CCPA, GDPR, FCRA, FDCPA where applicable (these are the document templates in the system).
9. **Versioning**: Start at v1.0.0. Increment minor for new sections, patch for corrections.

### Key Technical Claims to Include

- D31337m3 provides decentralized, end-to-end encrypted search with cryptographic proof of data integrity on-chain
- The PoA AppChain commits Merkle roots of encrypted payloads — not the payloads themselves
- Search results are encrypted with the searcher's X25519 public key — only the searcher can decrypt
- Node operators earn free subscriptions by contributing compute/bandwidth
- The platform generates legally-binding documents (CCPA, GDPR, DMCA, C&D letters) with embedded digital signatures
- Seed phrase recovery uses BIP-39 mnemonics with deterministic Ed25519 keypair derivation via PBKDF2
- ESP32 nodes run firmware with an embedded React web UI for configuration and monitoring

### Validation

After writing/updating the whitepaper:
1. Verify all technical claims against the actual codebase
2. Check that architecture diagrams match the real service topology
3. Ensure all mentioned features are actually implemented (check CHANGELOG.md)
4. Run `npm run typecheck` on frontends to verify no broken references
