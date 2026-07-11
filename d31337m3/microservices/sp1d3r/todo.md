# Sp1d3r — Working Log

## Rules

- Log completed items, errors, and verification results here.
- Keep changes aligned with `agents.md`.
- Build and verify before marking items done.

---

## Phase 1 — AppChain State Machine

- [x] Transaction header byte packing/unpacking (212-byte format)
- [x] Ed25519 signature creation and verification
- [x] PoA-style authenticated node registry
- [x] Approved application hash registry with quarantine on mismatch
- [x] Hash-only payload commit tracking with Merkle root storage
- [x] Plaintext PII guard — rejects transactions containing raw emails, SSNs, phone numbers

## Phase 2 — Crawler Worker

- [x] Concurrent worker pool (configurable `max_workers`)
- [x] X25519 + AES-256-GCM encryption (ephemeral key exchange, HKDF derivation)
- [x] Plaintext PII rejection before encryption
- [x] Encrypted finding persistence (`FindingStore` — JSON files on disk)

## Phase 3 — Binary Signature Self-Check

- [x] Executable hash calculation (`running_binary_hash`)
- [x] `APP_SIG_VERIFY` startup handshake against chain

## Phase 4 — Core Orchestrator

- [x] Default `config.toml` serializer
- [x] Atomic config write with `fsync()` (handles `PermissionError` on directory fsync)

## Phase 5 — HTTP Server + API

- [x] Threading HTTP server with CORS
- [x] Chain state, snapshot, block sync, peer management endpoints
- [x] Gossip acceptance endpoint with signature verification
- [x] Task queue CRUD API (create, list, assign, detail, result)
- [x] Inline crawl endpoint (`/v1/crawl`)
- [x] Director registration on boot

## Phase 6 — P2P Network

- [x] `PeerStore` with persistent JSON, stale peer pruning, failed ping tracking
- [x] `GossipWorker` background thread — queue dedup, fan-out to peers, heartbeat loop
- [x] Seed node sync on boot (snapshot validation + block import)
- [x] Ed25519-signed P2P requests (`X-Node-Pubkey` / `X-Node-Signature` headers)

## Verification Log

- 2026-07-07: Python 3.11 available, `cryptography` 46.0.5
- 2026-07-07: `python -m compileall src tests` passed
- 2026-07-07: `python -m unittest discover -s tests` — initial failure on Windows `fsync()` `PermissionError`; patched atomic writer to skip directory fsync where OS denies directory handles
- 2026-07-07: All 6 tests pass

---

## Upcoming

### Task Queue

- [ ] Priority scheduling — weighted task ordering, not just FIFO
- [ ] Rate limiting per-node — max concurrent tasks, cooldown periods

### P2P

- [ ] Encrypted transport — TLS or noise protocol for peer connections
- [ ] Peer exchange — nodes share peer lists during gossip
- [ ] Ban list — persistent node blacklisting with TTL

### Crawler

- [ ] Anti-fingerprinting — User-Agent rotation, request header randomization
- [ ] Async gateway — async/await HTTP fetching for higher throughput

### Chain

- [ ] Pruning — archive old blocks, keep only recent window + Merkle roots
- [ ] CLI improvements — `sp1d3r-cli` tool for chain inspection, manual task creation, peer management
