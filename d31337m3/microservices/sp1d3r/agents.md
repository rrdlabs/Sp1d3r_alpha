# Sp1d3r — AI Developer Agent Directive

This is the implementation reference for the **sp1d3r** service: the PoA blockchain, distributed crawler, task queue, and P2P gossip network that forms the core engine of the d31337m3 platform.

---

## What Sp1d3r Is

Sp1d3r is a Python service (port 9000) that combines four subsystems:

1. **Proof-of-Authority blockchain** — validates node identity, verifies binary signatures, and stores encrypted payload commitment roots
2. **Encrypted crawler worker** — fetches URLs, encrypts findings with X25519/AES-256-GCM, and commits payload hashes to the chain
3. **Task queue** — persistent JSON-backed queue for distributing crawl work to volunteer nodes
4. **P2P gossip** — propagates new transactions across the peer network and syncs chain state from seed nodes

---

## Transaction Format

Every transaction is exactly **212 bytes**, packed with `struct.pack(">I32sQ32s32s64s")`:

| Offset | Size | Field |
|---|---|---|
| 0 | 4 | `transaction_type` (uint32 big-endian) |
| 4 | 32 | `sender_pubkey` (Ed25519 public key) |
| 36 | 8 | `block_timestamp` (uint64 unix epoch) |
| 44 | 32 | `payload_hash` (SHA-256) |
| 76 | 32 | `merkle_root` |
| 108 | 64 | `digital_signature` (Ed25519) |

### Transaction Types

| Code | Name | Purpose |
|---|---|---|
| `0x01` | `NODE_AUTH` | Register a node's Ed25519 key in the authenticated set |
| `0x02` | `APP_SIG_VERIFY` | Binary integrity check — hash must match an approved app hash |
| `0x03` | `PAYLOAD_COMMIT` | Commit an encrypted finding's Merkle root to the chain |

The signing payload excludes the 64-byte signature field (148 bytes signed via `">I32sQ32s32s"` format).

---

## How the Chain Works

- **Consensus**: Proof-of-Authority. No mining, no gas. Validator seats are restricted to hardcoded pubkeys in `ChainConfig`.
- **State**: maintained in-memory and persisted to `chain_state.json` via atomic write (write tmp, fsync, rename).
- **Genesis**: `GENESIS_PREV_HASH = b"\x00" * 32`. First block hashes `genesis_prev_hash + packed_tx`.
- **Block linking**: each block hash is `SHA-256(previous_block_hash + packed_transaction)`.
- **PII guard**: every submitted transaction is scanned for plaintext emails, SSNs, and phone numbers. If detected, the sender is removed from the authenticated set and the transaction is rejected with `critical` severity.
- **Binary verification**: if a node submits an `APP_SIG_VERIFY` transaction and its hash is not in `approved_app_hashes`, the node is quarantined (removed from authenticated set).
- **Snapshot export**: chain state (height, authenticated nodes, approved hashes, payload roots) can be exported as JSON for seed sync.
- **Block import**: nodes can sync from a seed by fetching blocks since their local height and replaying them through the submit pipeline.

### Key Source Files

| File | Purpose |
|---|---|
| `src/d31337m3_chain/transaction.py` | 212-byte transaction packing/unpacking, Ed25519 signing |
| `src/d31337m3_chain/chain.py` | AppChain class — submit, block linking, state persistence, PII guard |
| `src/d31337m3_chain/crypto.py` | Ed25519Identity wrapper, SHA-256, signature verification |
| `src/d31337m3_chain/merkle.py` | Merkle root computation from leaf hashes |
| `src/d31337m3_chain/pii_guard.py` | Regex-based detection of emails, SSNs, phone numbers |
| `src/d31337m3_chain/p2p.py` | PeerStore, GossipWorker, signed HTTP fetch helpers |

---

## How the Crawler / Task Queue Works

### Crawler Worker

- `CrawlerWorker` takes raw page content, encrypts it for a recipient public key using ephemeral X25519 key exchange + AES-256-GCM (HKDF-derived key with `info=b"d31337m3-crawler-e2ee-v1"`).
- Rejects payloads that contain plaintext PII before encryption.
- Returns an `EncryptedFinding` containing: ephemeral public key, nonce, ciphertext, payload hash, and Merkle root.
- `FindingStore` persists encrypted findings as JSON files on disk, keyed by payload hash.

### Task Queue

- `TaskQueue` is thread-safe, JSON-file-backed (`tasks.json` in the data directory).
- Tasks have states: `pending` → `assigned` → `completed`.
- `assign_next(pubkey)` atomically claims the first pending task for a node.
- `complete(task_id, results, failures)` records outcomes and timestamps.

### Task Flow

1. Admin or API creates a task via `POST /v1/tasks/create` with URLs and recipient pubkey
2. Node agent polls `GET /v1/tasks/pending` with its pubkey header
3. Node agent fetches URLs, encrypts findings, commits to chain
4. Node agent submits results via `POST /v1/tasks/result`

### Key Source Files

| File | Purpose |
|---|---|
| `src/d31337m3_crawler/worker.py` | CrawlerWorker, EncryptedFinding, FindingStore |
| `src/d31337m3_crawler/self_check.py` | Binary hash verification against chain |
| `task_queue.py` | TaskQueue, Task dataclass |

---

## How P2P Gossip Works

### Peer Management

- `PeerStore` maintains a list of known peers (URL, pubkey, height, last_seen, failed_pings).
- Peers are persisted to `peers.json` via atomic write.
- Stale peers are pruned after 300s of inactivity.
- Peers exceeding 3 failed pings are automatically removed.

### Gossip Propagation

- `GossipWorker` runs a background thread (2s interval by default).
- When a transaction is committed, it's queued for gossip (deduped by SHA-256 hash of packed bytes).
- Each cycle: flush the gossip queue to all known peers via `POST /v1/chain/gossip`, then heartbeat all peers via `GET /v1/chain/ping`.
- All P2P requests are signed with `X-Node-Pubkey` + `X-Node-Signature` headers.
- Peers that fail heartbeat are tracked via `increment_failed`; removed after threshold.

### Seed Sync

- On boot, if `SP1D3R_SEED_NODE` is set, the node fetches a snapshot from the seed, validates `chain_id` and `genesis_prev_hash`, then imports any blocks ahead of its local height.

### Key Source Files

| File | Purpose |
|---|---|
| `src/d31337m3_chain/p2p.py` | PeerStore, GossipWorker, sign/verify helpers |
| `app.py:88-124` | `_sync_from_seed()` — boot-time chain sync |
| `app.py:127-132` | Gossip callback wired to chain on_commit |

---

## HTTP API

Defined in `app.py` via `Sp1d3rHandler`:

### Chain Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health + chain stats |
| `GET` | `/v1/chain/state` | Chain state summary |
| `GET` | `/v1/chain/snapshot` | Full chain snapshot for seed sync |
| `GET` | `/v1/chain/blocks?since=N` | Blocks since height N |
| `GET` | `/v1/chain/peers` | Known peer list |
| `POST` | `/v1/chain/peers` | Register a new peer |
| `POST` | `/v1/chain/gossip` | Accept a gossiped transaction |
| `GET` | `/v1/chain/ping` | Peer heartbeat |
| `GET` | `/v1/chain/sync` | Current sync status |

### Task Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/tasks/create` | Create a new crawl task |
| `GET` | `/v1/tasks` | List all tasks (optional `?status=` filter) |
| `GET` | `/v1/tasks/pending` | Claim next pending task for a node |
| `GET` | `/v1/tasks/{id}` | Get task details |
| `POST` | `/v1/tasks/result` | Submit task completion results |

### Crawl Endpoint

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/crawl` | Inline crawl — fetch URLs, encrypt, commit, return results |

---

## Configuration

Environment variables (see `app.py`):

| Variable | Default | Description |
|---|---|---|
| `SP1D3R_HOST` | `0.0.0.0` | Bind address |
| `SP1D3R_PORT` | `9000` | Listen port |
| `SP1D3R_DATA_DIR` | `/tmp/sp1d3r-data` | Persistent data directory |
| `SP1D3R_SEED_NODE` | `""` | Seed node URL for initial sync |
| `SP1D3R_GOSSIP_ENABLED` | `true` | Enable P2P gossip |
| `DIRECTOR_URL` | `http://127.0.0.1:8400` | Director service URL |

Default config (written to `config.toml`):

```toml
[blockchain]
chain_id = "d31337m3-mainnet-1"
consensus_mode = "proof-of-authority"
block_time_ms = 2000

[node_security]
enforce_binary_check = true
quarantine_on_mismatch = true
signature_algorithm = "Ed25519"

[privacy]
zero_knowledge_logging = true
encryption_standard = "X25519-AES-256-GCM"
```

---

## Test Coverage

Tests are in `tests/` and run via `python -m unittest discover -s tests`:

| File | What It Tests |
|---|---|
| `test_chain.py` | Transaction packing, signature verification, chain submit, PII guard, block import |
| `test_chain_p2p.py` | PeerStore add/remove/prune, GossipWorker queue dedup, sign/verify helpers |
| `test_worker_and_config.py` | CrawlerWorker encryption, FindingStore save/load, Config serialization, atomic write |

All 6 tests pass. `PYTHONPATH` must include `src/` for imports.
