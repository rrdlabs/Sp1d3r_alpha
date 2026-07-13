# D31337m3 Whitepaper

**Version 1.0.0** — July 2026

**The Decentralized Privacy Management & Crawling Search Platform**

---

## Abstract

D31337m3 ("Delete Me") is a decentralized privacy and reputation management platform that combines a distributed crawler network with a custom Proof-of-Authority AppChain. Powered by Sp1d3r — a private search engine with end-to-end encryption — the platform scrapes data from web brokers and search engine indexes, commits cryptographic proofs to an immutable blockchain, and provides identity management, legal document generation, secure messaging, and keyword monitoring. Users retain full control of their data through Ed25519 cryptographic authentication, X25519 key agreement, and AES-256-GCM encrypted search results that only the requester can decrypt.

---

## 1. The Privacy Problem

Personal data is harvested, aggregated, and sold by data brokers at industrial scale. Services like Spokeo, BeenVerified, and Intelius expose names, addresses, phone numbers, family members, and financial records to anyone willing to pay. Search engine indexes compound the problem by permanently caching this information.

Existing solutions have critical limitations:

- **Manual opt-out** is tedious, fragile, and must be repeated as brokers re-collect data
- **Privacy services** (DeleteMe, Privacy.com) operate as centralized intermediaries — users must trust them with the same data they're trying to protect
- **HaveIBeenPwned** only detects breaches; it cannot remove exposed data
- **Legal tools** (CCPA, GDPR) exist but are underutilized because most people don't know how to exercise their rights

D31337m3 addresses these gaps by combining automated discovery, cryptographic privacy, legal document generation, and a decentralized crawler network that distributes trust.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       D31337m3 Platform                             │
├────────────┬──────────┬──────────┬────────┬─────────┬──────────────┤
│  CityHall  │ Director │ Historian│ Lawyer │ Inboxer │   Sp1d3r     │
│  (8000)    │ (8400)   │ (8100)   │ (8200) │ (8300)  │   (9000)     │
│  Auth &    │ Service  │ Record   │ Legal  │ Messag- │  Blockchain  │
│  Identity  │ Health   │ Store    │ Docs   │ ing     │  + Crawler   │
├────────────┴──────────┴──────────┴────────┴─────────┴──────────────┤
│  Banker (8700)              │  Spiderwire (8600)                    │
│  Subscriptions & Payments   │  Networking Fabric                    │
├─────────────────────────────┴──────────────────────────────────────┤
│  React Frontends: Desktop (d31337m3.com) + Mobile PWA (m.d31337m3.com) │
├─────────────────────────────────────────────────────────────────────┤
│  ESP32 Crawler Nodes — Distributed peer devices for crawling       │
└─────────────────────────────────────────────────────────────────────┘
```

All 9 microservices run under pm2 on the host. PostgreSQL provides shared persistence. ESP32 nodes run as standalone firmware with embedded web UIs.

---

## 3. The Sp1d3r Search Engine

Sp1d3r is the decentralized private search engine powering D31337m3. It provides two modes of search: Encrypted Search (direct URL crawling) and Super Search (multi-engine meta-search).

### 3.1 Encrypted Search Pipeline

Users submit one or more URLs along with their X25519 public key. The system:

1. Creates crawl tasks for each URL
2. Distributes tasks across connected node agents
3. Nodes fetch page content, extract data, and return content hashes
4. Results are encrypted with the requester's X25519 public key using AES-256-GCM
5. Encrypted payloads are committed to the AppChain via Merkle tree roots
6. Only the original requester can decrypt results using their private key

```
User (X25519 pubkey) → POST /v1/search → Task Queue → Node Agents
                                                         │
User ← Encrypted results ← SearchStore ← Chain commit ←─┘
```

**Key property**: The server never sees plaintext search results. Encryption happens client-side with X25519 ECDH + HKDF-SHA256 key derivation + AES-256-GCM symmetric encryption.

### 3.2 Super Search (Meta-Search)

Super Search aggregates results from multiple search engines in parallel:

- **Google Custom Search API** (when configured)
- **Bing Web Search API** (when configured)
- **DuckDuckGo Instant Answer API** (free, enabled by default)

Results are deduplicated by URL, ranked by cross-engine consensus (frequency and position), and the top 20 results are encrypted with the user's X25519 public key. Super Search is a subscriber-only feature.

### 3.3 Distributed Crawler Network

Crawl tasks are distributed across peer nodes via a file-based task queue. Nodes poll for pending tasks, fetch URLs, compute content hashes, and submit results. The Director service tracks node health, uptime, and version through periodic heartbeats.

Node operators earn free Professional subscriptions by maintaining 72+ hours of uptime.

---

## 4. Proof-of-Authority AppChain

D31337m3 runs a custom Proof-of-Authority blockchain optimized for privacy operations. The chain commits cryptographic proofs without exposing user data.

### 4.1 Transaction Types

Each transaction is a compact binary structure (212 bytes):

| Type | Code | Purpose |
|------|------|---------|
| `NODE_AUTH` | `0x01` | Register or authenticate a node on the chain |
| `APP_SIG_VERIFY` | `0x02` | Binary self-check — node hashes its own executable and submits for verification |
| `PAYLOAD_COMMIT` | `0x03` | Commit encrypted payload hashes (Merkle roots) to the chain |

### 4.2 Ed25519 Digital Signatures

All transactions and P2P communications are signed with Ed25519 keys. The system uses:

- **Ed25519** for signatures (128-bit security, compact 64-byte signatures)
- **X25519** for key agreement (ECDH shared secret derivation)
- **SHA-256** for hashing
- **AES-256-GCM** for authenticated encryption

Node authentication uses a challenge-response protocol: the server issues a 32-byte random challenge, the client signs it with their Ed25519 private key, and the server verifies against the stored public key.

### 4.3 Merkle Tree Payload Commitment

Encrypted search results and crawl findings are committed to the chain via Merkle tree roots. The tree hashes individual payload hashes into a single root that is stored on-chain. This provides:

- **Integrity proof**: Any tampering with a payload invalidates the Merkle proof
- **Efficiency**: Only the root (32 bytes) is stored on-chain; full payloads remain off-chain
- **Verifiability**: Any party can verify a payload was committed by checking the Merkle path

### 4.4 PII Detection & Alerting

The chain includes a PII guard that scans transactions for plaintext personal information (emails, SSNs, phone numbers). Transactions containing raw PII are rejected and the sender is stripped from the authenticated node set. This ensures user data never appears on-chain in cleartext.

---

## 5. Identity & Access Management (CityHall)

CityHall is the identity backbone of D31337m3. It manages user registration, authentication, authorization, and profile data.

### 5.1 Authentication Methods

**Password + JWT**: Standard bcrypt-hashed passwords with HS256 JWT tokens (24-hour TTL).

**Ed25519 Key Authentication**: Users generate an Ed25519 keypair during registration. The challenge-response protocol allows cryptographic login without passwords:

1. Client requests a challenge from `/auth/challenge`
2. Client signs the challenge with their Ed25519 private key
3. Server verifies the signature against the stored public key
4. On success, server issues a JWT

**Seed Phrase Recovery**: During registration, a 12-word BIP-39 mnemonic is generated. The Ed25519 keypair is deterministically derived from the mnemonic via PBKDF2 (200,000 iterations, SHA-256, salt `d31337m3-seed-v1`). If a user loses their private key, they can recover the same keypair from the seed phrase.

### 5.2 RBAC Roles

Roles are additive boolean flags on the user model:

| Role | Access |
|------|--------|
| `is_user` | Base role, assigned at registration |
| `is_nodeop` | Can run crawler nodes, earns free subscription |
| `is_tech_op` | Technical support access |
| `is_chat_op` | Chat moderation |
| `is_admin` | Full admin dashboard access |
| `is_super_admin` | Can promote other admins |

### 5.3 Trial Mode

New users receive 1 free search per day for 7 days (7 total searches) without a subscription. After trial exhaustion, users are directed to a paywall. Trial status is tracked via `trial_searches_used` and `trial_started_at` on the User model.

### 5.4 Node Enrollment

Admins create enrollment tokens. Volunteers use tokens to register, which automatically grants `is_nodeop` status and a free Professional subscription (subject to 72-hour uptime enforcement).

---

## 6. End-to-End Encryption

D31337m3 implements end-to-end encryption for all search results using the X25519 Elliptic Curve Diffie-Hellman protocol.

### 6.1 X25519 Key Agreement

Each user generates an X25519 keypair stored in the browser (never sent to the server). When submitting a search:

1. User's X25519 public key is sent with the search request
2. Server generates an ephemeral X25519 keypair
3. ECDH computes a shared secret from (user_private × server_ephemeral_public)
4. HKDF-SHA256 derives a symmetric encryption key from the shared secret

### 6.2 AES-256-GCM Payload Encryption

Search results are encrypted with AES-256-GCM using the derived key. Each encrypted payload includes:

- `ephemeral_public_key` (32 bytes) — allows the user to recompute the shared secret
- `nonce` (12 bytes) — unique per-encryption random value
- `ciphertext` — encrypted search results

### 6.3 Client-Side Decryption

Decryption happens entirely in the browser:

1. User's private key × ephemeral public key → shared secret
2. HKDF-SHA256 → symmetric key
3. AES-256-GCM decrypt → plaintext results

**The server never has access to the decryption key.** Even a compromised server cannot read search results.

---

## 7. Legal Document Generation (Lawyer)

D31337m3 generates legally-binding documents for privacy rights enforcement across Canada, USA, and Mexico.

### 7.1 Template System

The platform includes 10 pre-built legal document templates:

| Template | Jurisdiction | Purpose |
|----------|-------------|---------|
| CCPA Opt-Out | California | California Consumer Privacy Act data deletion request |
| GDPR Erasure | EU | General Data Protection Regulation right to erasure |
| Data Broker Removal | Multi-state | Generic data broker opt-out request |
| Cease & Desist (Harassment) | Multi-state | Demand to stop harassing contact |
| Cease & Desist (Defamation) | Multi-state | Demand to stop defamatory statements |
| DMCA Takedown | US Federal | Digital Millennium Copyright Act takedown notice |
| FCRA Dispute | US Federal | Fair Credit Reporting Act dispute of inaccurate information |
| FDCPA Validation | US Federal | Fair Debt Collection Practices Act debt validation request |
| General Opt-Out | Multi-state | Generic privacy opt-out letter |
| Account Deletion | Multi-state | Request to delete online account data |

### 7.2 Digital Signatures

Users can draw, type, or upload a signature that is stored as a base64 PNG. Signatures are embedded directly into generated documents as `<img>` tags, creating a visual signature on the PDF.

### 7.3 Auto-Submission

Documents can be configured for auto-submission. When `auto_submit` is enabled and a recipient email is set, the system automatically sends the document via SMTP upon generation. Submission is tracked with `sent_at` timestamps.

### 7.4 Profile Auto-Fill

Document templates use placeholder variables (`[YOUR NAME]`, `[YOUR EMAIL]`, `[YOUR ADDRESS]`, etc.) that are automatically filled from the user's profile data. Users complete their profile once and all subsequent documents are pre-populated.

---

## 8. Subscription & Payment Model (Banker)

### 8.1 Tier Structure

| Tier | Price | System Searches (30-day) | Features |
|------|-------|--------------------------|----------|
| Free | $0 | 100 | Basic search, limited documents |
| Starter | $9.99/mo | 500 | Full search, all templates, keyword tracking |
| Professional | $29.99/mo | 2,000 | Super Search, priority support, advanced analytics |
| Enterprise | $99.99/mo | 10,000 | API access, bulk operations, dedicated support |

### 8.2 Node Operator Free Tier

Users who run a Sp1d3r crawler node receive a free Professional subscription. The system checks node uptime via Director heartbeats. If a node goes offline for more than 72 hours, the subscription is automatically suspended and reactivated when the node comes back online.

### 8.3 Payment Methods

- **Stripe**: Credit/debit card payments
- **Interac e-Transfer**: Canadian bank transfers
- **Cryptocurrency**: On-chain payment verification via RPC (checks recipient, ERC-20 transfer events, amount, and transaction status)

---

## 9. ESP32 Crawler Nodes

D31337m3 uses ESP32-WROOM microcontrollers as lightweight crawler nodes. Each node runs custom firmware with an embedded React web UI.

### 9.1 Firmware Architecture

- **ESP-IDF 5.4.3** with mbedTLS 3.6.4
- **Identity**: SHA-256 HMAC-based (Ed25519 unavailable in mbedTLS 3.6.4), producing 32-byte public keys
- **Networking**: WiFi connectivity with HTTP task polling
- **Embedded Web UI**: React-based configuration interface served directly from the ESP32

### 9.2 Web Flasher

The platform includes a browser-based ESP32 flasher using WebSerial API and `esptool-js`. Users can flash firmware directly from the web interface without installing any tools. The flasher supports configurable baud rates with automatic fallback.

### 9.3 Factory Binary

A pre-compiled merged binary (bootloader + partition table + application) is hosted at `/firmware/sp1d3r_node_esp32_v0.1.0.bin`. The merged binary is safe to flash at address `0x0` using `esptool.py merge_bin`.

---

## 10. Reputation System

The platform maintains a composite reputation score for each user based on:

**Platform Activity:**
- Search usage (proportional to tier)
- Document generation
- Node uptime (if node operator)
- Subscription tier and duration
- Account age

**On-Chain Attestations:**
- External parties can submit attestation events via API
- Each event carries points and a description
- Attestations can include transaction hashes for on-chain verification

**Badges** are assigned based on composite score thresholds:
- Newcomer (0-19), Active (20-49), Established (50-79), Trusted (80-100)

---

## 11. Keyword Tracking & Monitoring

Users can add keywords to monitor across the web. The system:

1. Stores keywords with notification preferences (dashboard, email)
2. Runs background crawls to discover keyword mentions
3. Records matches with source URL, context snippet, and relevance score
4. Surfaces matches in a browsable match browser with mark-as-read functionality

Keyword searches use the system search tier (separate from manual search limits) with 30-day rolling windows.

---

## 12. Privacy & Security Considerations

**Zero-Knowledge Search**: Search results are encrypted with the user's X25519 public key. The server stores only ciphertext and can never read plaintext results.

**On-Chain Minimalism**: Only Merkle roots (32 bytes) are committed to the blockchain. Full payloads, search queries, and user data never appear on-chain.

**PII Guard**: The blockchain rejects transactions containing plaintext personal information.

**Client-Side Keys**: X25519 private keys are stored in the browser's localStorage and never transmitted to the server.

**Seed Phrase Recovery**: BIP-39 mnemonics are hashed (SHA-256) before storage. The plaintext mnemonic is shown only once during registration.

**Rate Limiting**: CityHall implements configurable rate limiting per IP address.

**Audit Logging**: All authentication events, admin actions, and data modifications are logged with IP addresses and timestamps.

---

## 13. Roadmap

### Near-Term
- [ ] WebSocket support for real-time task push (replacing polling)
- [ ] P2P encrypted transport (X25519+AES-256-GCM for node responses)
- [ ] Node reputation scoring system
- [ ] Crawl task priority and scheduling
- [ ] Chain pruning for old blocks

### Mid-Term
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Node operator dashboard (user-facing stats)
- [ ] Geolocation-based task routing
- [ ] Peer exchange (PEX) for wider network discovery
- [ ] Resend domain verification for email delivery

### Long-Term
- [ ] Mobile-responsive admin dashboard improvements
- [ ] Docker Compose for full local development stack
- [ ] Public API for third-party integrations
- [ ] Multi-language document templates

---

## 14. Conclusion

D31337m3 provides a comprehensive, cryptographically-secured platform for privacy management. By combining decentralized crawling, end-to-end encrypted search, a Proof-of-Authority blockchain, and automated legal document generation, it gives users actionable tools to reclaim their privacy — not just awareness of the problem, but a pathway to resolution.

The platform's design ensures that user data is encrypted at every layer: search results are encrypted client-side, payloads are committed to the chain as Merkle roots only, and legal documents are generated with embedded digital signatures. Node operators contribute compute resources and earn free access, creating a sustainable decentralized network.

D31337m3 is not just a privacy tool — it is infrastructure for a more private internet.

---

*D31337m3 — Powered by Sp1d3r Decentralized Private Search Engine — a WEB3 Service by RRDLabs*
