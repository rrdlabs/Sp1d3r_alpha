# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] — 2026-07-17

### Official Public Beta

This is the first public beta release of D31337m3. The platform is feature-complete
for the public beta milestone. All components are operational and tested with
multi-node peer operation.

### Platform

- CityHall, Sp1d3r, Director, Banker, Historian, Lawyer, Inboxer, Picaso, Spiderwire
- pm2 process management for all 9 microservices
- Docker Compose setup for node agents
- Nginx reverse proxy with TLS for d31337m3.com, admin.d31337m3.com, mobile.d31337m3.com

### Cryptography

- Ed25519 + X25519 key generation (browser-native WebCrypto, `curve25519` → `X25519`)
- JWT authentication with 24h expiry
- PEX (Privacy-Enhanced Exchange) with X25519 ECDH key agreement
- Message signing and verification via Ed25519
- Internal API key authentication for inter-service communication

### Node Agent

- Multi-node peer operation with unique service registration per node (`node-agent-{pubkey[:8]}`)
- Automatic CityHall registration, Director heartbeat, chain sync
- Docker container with always-on operation
- P2P gossip protocol
- Version: 0.5.0-beta

### Frontend

- **Desktop (d31337m3.com)**: Search, chat, PEX, inbox, reputation, admin panels
- **Mobile Admin (admin.d31337m3.com)**: Admin dashboard, user/broker management, email, logs
- **Mobile (mobile.d31337m3.com)**: User dashboard, chat, subscriptions
- X25519 browser compatibility fix (Chrome 149+)
- PWA support with service worker

### Fixes

- Fixed recipient_pubkey_required 400 error on search (X25519 WebCrypto spec fix)
- Fixed node agent heartbeat collision when running multiple nodes
- Fixed mobile mobile-admin stale JWT handling
- Fixed desktop admin panel response key mismatches (items/users/brokers)
- Fixed mobile mobile-admin hardcoded localhost URLs

### Security

- Hardcoded secrets removed from source (replaced with env vars / CHANGE_ME defaults)
- Sensitive files excluded from git (.env, *.pem, *.key, ecosystem.config.js)
- CORS configured for production domains

---

## [0.3.0] — 2026-07-15

- Sp1d3r chain core, crawler, orchestrator
- Docker build for chain

## [0.2.0] — 2026-07-14

- CityHall onboarding gateway
- Auth, profiles, broker management
- PEX protocol, reputation system

## [0.1.0] — 2026-07-13

- Initial project structure
- Whitepaper
- Frontend scaffold
