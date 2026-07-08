# TODO — Single-Pass Actionable Items

## ✅ Completed

- [x] Add `node_modules` / `dist` to `.gitignore` (root + frontend)
- [x] Deduplicate Sp1d3r source — no duplicate exists in workspace
- [x] Wire `POST /v1/crawl` stub to actually invoke the real crawler engine (`d31337m3_crawler/worker.py`)
- [x] Persist chain state to disk (currently in-memory only — `chain.py`)
- [x] Persist crawler findings to durable encrypted ciphertext storage (currently in-memory only)
- [x] CityHall: add automated unit tests with `TestClient` (FastAPI) — 10 tests passing
- [x] CityHall: add rate limiting (configurable middleware)
- [x] CityHall: implement email verification flow
- [x] Sp1d3r: implement chain CLI entry point for self-check
- [x] Sp1d3r: implement PII detection alerting
- [x] Add missing `requirements.txt` for historian and lawyer (Docker builds)

## ✅ Completed (P2P Sync v0.3.0)

- [x] Seed node config (`SP1D3R_SEED_NODE` / `--seed`)
- [x] `GET /v1/chain/blocks?since=<height>` — returns packed blocks
- [x] `GET /v1/chain/snapshot` — returns full chain state
- [x] `AppChain.import_blocks()` — validate & replay transactions
- [x] Sync-on-boot from seed node
- [x] `GET /v1/chain/peers` + `POST /v1/chain/peers`
- [x] Peer store (peers.json persistence, prune, heartbeat tracking)
- [x] `GET /v1/chain/ping` — signed heartbeat endpoint
- [x] Transaction gossip (`POST /v1/chain/gossip`, `GossipWorker`)
- [x] Block announcement via gossip callback
- [x] Gossip dedup (by transaction hash)
- [x] Fork detection during import (chain linkage validation)
- [x] `GET /v1/chain/sync` — sync status endpoint
- [x] Genesis block hash hardcoded (`GENESIS_PREV_HASH`)
- [x] P2P auth scheme (signed `X-Node-Pubkey` / `X-Node-Signature` headers)

## 🔲 Remaining

- [ ] Enable `docker compose up --build` for all 7 services to work without errors
