# SP1D3R - AppChain & Distributed Crawler

Custom Proof-of-Authority AppChain with an integrated crawler, task queue, and P2P gossip network. Serves as the decentralized backbone for the d31337m3 platform.

**Port:** 9000 (via pm2)

## Features

- **212-byte fixed transaction format** with compact binary packing
- **3 transaction types:** data commit, metadata, and control
- **Ed25519 signatures** for transaction signing and chain verification
- **Merkle trees** for block integrity proofs
- **PII detection** via `pii_guard` to scrub sensitive data before chain commit
- **X25519 + AES-256-GCM encryption** for payload confidentiality
- **P2P gossip protocol** for peer-to-peer block and transaction propagation
- **Peer store** tracking known nodes and their chain state
- **Chain sync** to catch up with the network on startup
- **Task queue** for distributing crawl jobs across worker nodes
- **Crawler worker** with startup self-check and encrypted local payload processing

## Source Layout

```
src/
  d31337m3_chain/          # AppChain core
    chain.py               # Block storage, validation, PoA state machine
    transaction.py         # 212-byte tx format, packing/unpacking
    crypto.py              # Ed25519 key generation, signing, verification
    merkle.py              # Merkle tree construction and proof
    pii_guard.py           # PII detection and scrubbing
    p2p.py                 # Gossip protocol, peer discovery, block propagation
    __main__.py            # Chain entrypoint
  d31337m3_core/           # Orchestrator and config
    config.py              # Config parsing, env vars, defaults
    orchestrator.py        # Service orchestration, atomic writes
    api.py                 # HTTP API layer
    gateway.py             # Gateway routing
  d31337m3_crawler/        # Crawler subsystem
    worker.py              # Crawl worker, payload processing
    self_check.py          # Startup health and capability verification
app.py                     # HTTP server entrypoint (port 9000)
task_queue.py              # In-memory task queue for distributed job dispatch
```

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/chain` | List blocks on the chain |
| GET | `/chain/:height` | Get a specific block by height |
| POST | `/tx` | Submit a new transaction |
| GET | `/peers` | List known P2P peers |
| POST | `/peers` | Register a new peer |
| POST | `/tasks` | Enqueue a crawl task |
| GET | `/tasks` | List queued and completed tasks |
| GET | `/task-queue/stats` | Task queue statistics |

## Running Tests

```bash
python -m compileall src tests
python -m unittest discover -s tests
```

## Test Files

- `tests/test_chain.py` - Chain creation, block append, tx validation
- `tests/test_chain_p2p.py` - P2P gossip, peer store, chain sync
- `tests/test_worker_and_config.py` - Crawler worker, config parsing, orchestrator
