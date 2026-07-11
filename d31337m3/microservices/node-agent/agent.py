#!/usr/bin/env python3
"""
d31337m3 Node Agent - lightweight peer node for the Sp1d3r network.

Runs a single service that:
  - Authenticates with CityHall
  - Registers as a peer on the Sp1d3r chain
  - Sends periodic heartbeats to Director
  - Syncs chain state from the platform
  - Participates in P2P gossip
  - Polls for and executes crawl tasks

Environment variables:
  CITYHALL_URL      - CityHall base URL (default: http://127.0.0.1:8000)
  SP1D3R_URL        - Sp1d3r chain base URL (default: http://127.0.0.1:9000)
  DIRECTOR_URL      - Director base URL (default: http://127.0.0.1:8400)
  AGENT_USERNAME    - CityHall username for auth
  AGENT_PASSWORD    - CityHall password for auth
  AGENT_TOKEN       - Pre-authenticated JWT (overrides username/password)
  AGENT_DATA_DIR    - Persistent data directory (default: /data)
  HEARTBEAT_INTERVAL - Seconds between heartbeats (default: 30)
  SYNC_INTERVAL     - Seconds between chain sync checks (default: 60)
  PEER_URL          - Public URL other peers can reach this node
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import signal
import sys
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Minimal ed25519 implementation (no heavy deps needed for agent)
# ---------------------------------------------------------------------------
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("node-agent")


def sha256_bytes(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


@dataclass(frozen=True)
class Ed25519Identity:
    private_key: Ed25519PrivateKey

    @classmethod
    def generate(cls) -> Ed25519Identity:
        return cls(Ed25519PrivateKey.generate())

    @classmethod
    def from_private_bytes(cls, raw: bytes) -> Ed25519Identity:
        if len(raw) != 32:
            raise ValueError("Ed25519 private key seed must be exactly 32 bytes")
        return cls(Ed25519PrivateKey.from_private_bytes(raw))

    @property
    def public_key(self) -> bytes:
        return self.private_key.public_key().public_bytes(
            encoding=Encoding.Raw,
            format=PublicFormat.Raw,
        )

    @property
    def private_seed(self) -> bytes:
        return self.private_key.private_bytes(
            encoding=Encoding.Raw,
            format=PrivateFormat.Raw,
            encryption_algorithm=NoEncryption(),
        )

    def sign(self, message: bytes) -> bytes:
        return self.private_key.sign(message)


def sign_request(
    identity: Ed25519Identity, method: str, path: str, body: bytes = b""
) -> tuple[str, str]:
    message = sha256_bytes(f"{method}{path}".encode() + body)
    sig = identity.sign(message)
    return identity.public_key.hex(), sig.hex()


def fetch_json(
    url: str,
    identity: Ed25519Identity | None = None,
    method: str = "GET",
    body: bytes = b"",
    headers: dict[str, str] | None = None,
    timeout: int = 10,
) -> dict[str, Any] | None:
    hdrs = {"Content-Type": "application/json", "User-Agent": "d31337m3-node-agent/0.1"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(
        url,
        data=body if method == "POST" else None,
        headers=hdrs,
        method=method,
    )
    if identity:
        pubkey_hex, sig_hex = sign_request(identity, method, url, body)
        req.add_header("X-Node-Pubkey", pubkey_hex)
        req.add_header("X-Node-Signature", sig_hex)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        log.debug("fetch_json %s %s failed: %s", method, url, exc)
        return None


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
class Config:
    cityhall_url: str = os.environ.get("CITYHALL_URL", "http://127.0.0.1:8000")
    sp1d3r_url: str = os.environ.get("SP1D3R_URL", "http://127.0.0.1:9000")
    director_url: str = os.environ.get("DIRECTOR_URL", "http://127.0.0.1:8400")
    username: str = os.environ.get("AGENT_USERNAME", "")
    password: str = os.environ.get("AGENT_PASSWORD", "")
    token: str = os.environ.get("AGENT_TOKEN", "")
    data_dir: Path = Path(os.environ.get("AGENT_DATA_DIR", "/data"))
    heartbeat_interval: int = int(os.environ.get("HEARTBEAT_INTERVAL", "30"))
    sync_interval: int = int(os.environ.get("SYNC_INTERVAL", "60"))
    peer_url: str = os.environ.get("PEER_URL", "")


# ---------------------------------------------------------------------------
# Key management
# ---------------------------------------------------------------------------
KEY_FILE = "node_key.seed"


def load_or_generate_identity(data_dir: Path) -> Ed25519Identity:
    key_path = data_dir / KEY_FILE
    data_dir.mkdir(parents=True, exist_ok=True)
    if key_path.exists():
        raw = key_path.read_bytes()
        if len(raw) == 32:
            log.info("Loaded existing node keypair")
            return Ed25519Identity.from_private_bytes(raw)
        log.warning("Key file corrupt, regenerating")
    identity = Ed25519Identity.generate()
    key_path.write_bytes(identity.private_seed)
    key_path.chmod(0o600)
    log.info("Generated new node keypair: %s", identity.public_key.hex()[:16])
    return identity


# ---------------------------------------------------------------------------
# CityHall authentication
# ---------------------------------------------------------------------------
def authenticate_cityhall(cfg: Config, identity: Ed25519Identity) -> str:
    if cfg.token:
        log.info("Using pre-authenticated token")
        return cfg.token
    if not cfg.username or not cfg.password:
        log.error("AGENT_USERNAME and AGENT_PASSWORD (or AGENT_TOKEN) are required")
        sys.exit(1)
    url = f"{cfg.cityhall_url.rstrip('/')}/auth/login"
    body = json.dumps({"username": cfg.username, "password": cfg.password}).encode()
    result = fetch_json(url, identity, method="POST", body=body)
    if not result or "access_token" not in result:
        log.error("CityHall auth failed: %s", result)
        sys.exit(1)
    log.info("Authenticated with CityHall as %s", cfg.username)
    return result["access_token"]


# ---------------------------------------------------------------------------
# Node registration + heartbeat
# ---------------------------------------------------------------------------
class NodeState:
    def __init__(self, identity: Ed25519Identity, cfg: Config, jwt: str):
        self.identity = identity
        self.cfg = cfg
        self.jwt = jwt
        self.chain_height: int = 0
        self.chain_hash: str = ""
        self.registered: bool = False
        self.running: bool = True

    @property
    def pubkey_hex(self) -> str:
        return self.identity.public_key.hex()

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.jwt}"}

    def register_peer(self) -> bool:
        url = f"{self.cfg.sp1d3r_url.rstrip('/')}/v1/chain/peers"
        peer_url = self.cfg.peer_url or f"node-agent://{self.pubkey_hex[:16]}"
        body = json.dumps({
            "url": peer_url,
            "pubkey": self.pubkey_hex,
        }).encode()
        result = fetch_json(
            url,
            self.identity,
            method="POST",
            body=body,
            headers=self._auth_headers(),
        )
        if result and result.get("status") == "peer_added":
            log.info("Registered as peer: %s", peer_url)
            self.registered = True
            return True
        log.warning("Peer registration failed: %s", result)
        return False

    def send_heartbeat(self) -> bool:
        url = f"{self.cfg.director_url.rstrip('/')}/services/node-agent/heartbeat"
        body = json.dumps({
            "pubkey": self.pubkey_hex,
            "height": self.chain_height,
            "status": "online",
            "version": "0.1.0-beta",
        }).encode()
        result = fetch_json(
            url,
            self.identity,
            method="POST",
            body=body,
            headers=self._auth_headers(),
        )
        if result and result.get("status") == "ok":
            log.debug("Heartbeat sent (height=%d)", self.chain_height)
            return True
        log.debug("Heartbeat failed: %s", result)
        return False

    def sync_chain(self) -> bool:
        url = f"{self.cfg.sp1d3r_url.rstrip('/')}/v1/chain/sync"
        result = fetch_json(
            url,
            self.identity,
            headers=self._auth_headers(),
        )
        if not result:
            return False
        remote_height = result.get("height", 0)
        remote_hash = result.get("tip_hash", "")
        if remote_height > self.chain_height:
            log.info("Chain sync: height %d -> %d", self.chain_height, remote_height)
            self.chain_height = remote_height
            self.chain_hash = remote_hash
            return True
        return False

    def poll_tasks(self) -> dict | None:
        url = f"{self.cfg.sp1d3r_url.rstrip('/')}/v1/tasks/pending"
        result = fetch_json(
            url,
            self.identity,
            headers=self._auth_headers(),
        )
        if result and result.get("task"):
            return result["task"]
        return None

    def submit_task_result(self, task_id: str, results: list, failures: list) -> bool:
        url = f"{self.cfg.sp1d3r_url.rstrip('/')}/v1/tasks/result"
        body = json.dumps({
            "task_id": task_id,
            "pubkey": self.pubkey_hex,
            "results": results,
            "failures": failures,
        }).encode()
        result = fetch_json(
            url,
            self.identity,
            method="POST",
            body=body,
            headers=self._auth_headers(),
        )
        return bool(result and result.get("status") == "accepted")

    def gossip_transaction(self, packed_hex: str) -> bool:
        url = f"{self.cfg.sp1d3r_url.rstrip('/')}/v1/chain/gossip"
        body = json.dumps({"transaction": packed_hex}).encode()
        result = fetch_json(
            url,
            self.identity,
            method="POST",
            body=body,
            headers=self._auth_headers(),
        )
        return bool(result and result.get("status") == "gossip_accepted")


# ---------------------------------------------------------------------------
# Background workers
# ---------------------------------------------------------------------------
def heartbeat_loop(state: NodeState, interval: int) -> None:
    while state.running:
        try:
            state.send_heartbeat()
        except Exception as exc:
            log.error("Heartbeat error: %s", exc)
        time.sleep(interval)


def sync_loop(state: NodeState, interval: int) -> None:
    while state.running:
        try:
            state.sync_chain()
        except Exception as exc:
            log.error("Sync error: %s", exc)
        time.sleep(interval)


def task_loop(state: NodeState, interval: int = 10) -> None:
    while state.running:
        try:
            task = state.poll_tasks()
            if task:
                task_id = task.get("id", "unknown")
                log.info("Received task: %s (type=%s)", task_id, task.get("type"))
                # For beta, we just acknowledge the task
                # Full task execution will be added when crawl worker is implemented
                state.submit_task_result(task_id, [], [])
        except Exception as exc:
            log.error("Task poll error: %s", exc)
        time.sleep(interval)


# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------
def handle_signal(signum: int, frame: Any, state: NodeState) -> None:
    log.info("Received signal %d, shutting down...", signum)
    state.running = False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    cfg = Config()
    log.info("=== d31337m3 Node Agent v0.1.0-beta ===")
    log.info("CityHall:  %s", cfg.cityhall_url)
    log.info("Sp1d3r:    %s", cfg.sp1d3r_url)
    log.info("Director:  %s", cfg.director_url)

    # Load or generate identity
    identity = load_or_generate_identity(cfg.data_dir)
    log.info("Node pubkey: %s", identity.public_key.hex())

    # Authenticate
    jwt = authenticate_cityhall(cfg, identity)

    # Initialize state
    state = NodeState(identity, cfg, jwt)

    # Register as peer
    if not state.register_peer():
        log.warning("Could not register as peer, will retry in background")

    # Fetch initial chain state
    state.sync_chain()

    # Signal handlers
    signal.signal(signal.SIGINT, lambda s, f: handle_signal(s, f, state))
    signal.signal(signal.SIGTERM, lambda s, f: handle_signal(s, f, state))

    # Start background workers
    workers = [
        threading.Thread(target=heartbeat_loop, args=(state, cfg.heartbeat_interval), daemon=True),
        threading.Thread(target=sync_loop, args=(state, cfg.sync_interval), daemon=True),
        threading.Thread(target=task_loop, args=(state, 10), daemon=True),
    ]
    for w in workers:
        w.start()

    log.info("Node agent running (pubkey=%s, height=%d)", identity.public_key.hex()[:16], state.chain_height)

    # Keep main thread alive
    try:
        while state.running:
            time.sleep(1)
    except KeyboardInterrupt:
        state.running = False

    log.info("Node agent stopped")


if __name__ == "__main__":
    main()
