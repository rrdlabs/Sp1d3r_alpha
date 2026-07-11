# P2P Chain Sync — Roadmap

Private P2P blockchain sync allowing sp1d3r nodes to discover each other, authenticate (Ed25519), and sync blocks.

All P2P communication must be **authenticated**, **encrypted** (X25519+AES-256-GCM), and **permissioned** (valid `NODE_AUTH` on-chain).

---

## P0 — Core Sync ✅ DONE

| # | Item | Status |
|---|------|--------|
| 1 | Seed node config (`--seed` / `SP1D3R_SEED_NODE`) | ✅ |
| 2 | `GET /v1/chain/blocks?since=<height>` | ✅ |
| 3 | `POST /v1/chain/snapshot` | ✅ |
| 4 | `AppChain.import_blocks()` | ✅ |
| 5 | Sync-on-boot from seed node | ✅ |

## P1 — Peer Discovery & Heartbeating ✅ DONE

| # | Item | Status |
|---|------|--------|
| 6 | `GET /v1/chain/peers` + `POST /v1/chain/peers` | ✅ |
| 7 | Peer store (peers.json persistence, prune, heartbeat) | ✅ |
| 8 | `GET /v1/chain/ping` signed heartbeat | ✅ |
| 9 | Stale peer pruning | ✅ |

## P2 — Gossip & Real-Time Propagation ✅ DONE

| # | Item | Status |
|---|------|--------|
| 10 | Transaction gossip + GossipWorker | ✅ |
| 11 | Block announcement via gossip callback | ✅ |
| 12 | Gossip dedup (by transaction hash) | ✅ |
| 13 | `GET /v1/chain/sync` sync status endpoint | ✅ |

## P3 — Hardening & Observability 🔲 TODO

| # | Item | Status |
|---|------|--------|
| 14 | Fork detection | 🔄 Partial |
| 15 | Node ban list | 🔲 |
| 16 | Encrypted transport for gossip | 🔲 |
| 17 | Peer exchange (PEX) | 🔲 |

---

## Implementation Notes

- **Auth**: Every P2P request includes `X-Node-Pubkey` (hex) + `X-Node-Signature` (hex of `SHA256(method+path+body)` signed Ed25519).
- **Encryption**: After auth, upgrade to X25519+AES-256-GCM for response body.
- **Wire format**: Binary tx packing (`TransactionHeader.pack()` = 212 bytes). Block sync sends packed bytes in batches.
