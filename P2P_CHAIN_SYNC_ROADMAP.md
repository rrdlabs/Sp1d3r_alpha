# Private P2P Blockchain Sync — Implementation Roadmap

Allow sp1d3r nodes to discover each other, authenticate (Ed25519 sigs), and sync blocks so the entire distributed network sees the same chain state.

All peer-to-peer communication must be:
- **Authenticated** — each request signed by the sender's Ed25519 node key
- **Encrypted** — use X25519 + AES-256-GCM (already in the codebase)
- **Permissioned** — only nodes with a valid `NODE_AUTH` on-chain entry can connect

---

## P0 — Must Have (core sync works)

| # | Item | Description |
|---|------|-------------|
| 1 | **Seed node config** | Add `--seed <url>` / `SP1D3R_SEED_NODE` env var. On first boot, pull chain state from seed node instead of starting empty. |
| 2 | **`GET /v1/chain/blocks?since=<height>`** | Returns all blocks from `height+1` to tip as packed binary. Signed response so the receiver can verify authenticity. |
| 3 | **`POST /v1/chain/snapshot`** | Returns the full chain state (all authenticated nodes, approved hashes, payload roots) for bootstrapping. Ed25519-signed. |
| 4 | **Block import** | `AppChain.import_blocks(blocks: list[bytes])` — validate each block's signature, replay transactions to rebuild state, reject bad blocks. |
| 5 | **Sync-on-boot** | On startup, if a seed peer is configured: fetch snapshot → fetch missing blocks → validate → apply. Fail hard if chain diverges. |

## P1 — Peer Discovery & Heartbeating

| # | Item | Description |
|---|------|-------------|
| 6 | **`GET /v1/chain/peers`** | List known peer URLs (each entry signed by that peer's key). |
| 7 | **`POST /v1/chain/peers`** | Register a peer. Body includes the peer's URL + `NODE_AUTH` transaction proving they're an authenticated node on-chain. |
| 8 | **Peer store** | Persist known peers to disk (`peers.json`) so the set survives restart. |
| 9 | **Heartbeat/ping** | `GET /v1/chain/ping` — lightweight signed timestamp. Used to detect dead peers after N missed heartbeats. |
| 10 | **Stale peer pruning** | Remove peers that haven't heartbeaten in > threshold. |

## P2 — Gossip & Real-Time Propagation

| # | Item | Description |
|---|------|-------------|
| 11 | **Transaction gossip** | When a node commits a new transaction, broadcast it to all known peers. Receiving nodes validate and re-commit locally if valid. |
| 12 | **Block announcement** | After a new block is appended, peer nodes receive a lightweight announcement (`block_hash`, `height`). |
| 13 | **Anti-spam / rate-limit on gossip** | Deduplicate incoming transactions by hash. Drop repeats and bad sigs without penalty. |
| 14 | **Peer exchange (PEX)** | When connecting to a new peer, exchange peer lists to discover the wider network without a central registry. |

## P3 — Hardening & Observability

| # | Item | Description |
|---|------|-------------|
| 15 | **Fork detection** | If a peer sends a block at height N that doesn't match the local block hash at that height, log alert, quarantine peer. |
| 16 | **Sync progress endpoint** | `GET /v1/chain/sync` — return `{"local_height": N, "peer_height": M, "synced": bool}`. |
| 17 | **Genesis block** | Hardcode a genesis block hash. Nodes refuse to peer with nodes that have a different genesis — prevents cross-chain pollution. |
| 18 | **Node ban list** | If a peer sends > N invalid blocks/signatures, ban its public key permanently (local only). |

---

## Implementation Notes

- **Authentication scheme**: Every P2P request includes headers `X-Node-Pubkey` (hex) and `X-Node-Signature` (hex of `SHA256(method + path + body)` signed by the node's Ed25519 key).
- **Encryption**: After authentication, upgrade to X25519 + AES-256-GCM for the response body (reuse existing `CrawlerWorker.encrypt_payload` pattern).
- **Wire format**: Binary transaction packing already exists (`TransactionHeader.pack()` = 212 bytes). Block sync sends these packed bytes in batches.
- **State machine**: `AppChain` already has `save()`/`load()`. The snapshot endpoint just returns the JSON state file contents (signed).
