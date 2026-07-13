from __future__ import annotations

import json
import threading
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from .crypto import Ed25519Identity, sha256_bytes, verify_ed25519
from .transaction import TransactionHeader, TRANSACTION_SIZE


def sign_request(
    identity: Ed25519Identity, method: str, path: str, body: bytes = b""
) -> tuple[str, str]:
    message = sha256_bytes(f"{method}{path}".encode() + body)
    sig = identity.sign(message)
    return identity.public_key.hex(), sig.hex()


def verify_signed_request(
    pubkey_hex: str, sig_hex: str, method: str, path: str, body: bytes
) -> bytes | None:
    if not pubkey_hex or not sig_hex:
        return None
    try:
        pubkey = bytes.fromhex(pubkey_hex)
        sig = bytes.fromhex(sig_hex)
        message = sha256_bytes(f"{method}{path}".encode() + body)
        if verify_ed25519(pubkey, sig, message):
            return pubkey
    except Exception:
        pass
    return None


def fetch_json(
    url: str,
    identity: Ed25519Identity | None = None,
    method: str = "GET",
    body: bytes = b"",
    timeout: int = 10,
) -> dict[str, Any] | None:
    req = urllib.request.Request(
        url,
        data=body if method == "POST" else None,
        headers={"Content-Type": "application/json", "User-Agent": "sp1d3r-p2p/0.1"},
        method=method,
    )
    if identity:
        pubkey_hex, sig_hex = sign_request(identity, method, url, body)
        req.add_header("X-Node-Pubkey", pubkey_hex)
        req.add_header("X-Node-Signature", sig_hex)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def fetch_binary(
    url: str,
    identity: Ed25519Identity | None = None,
    timeout: int = 10,
) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": "sp1d3r-p2p/0.1"})
    if identity:
        pubkey_hex, sig_hex = sign_request(identity, "GET", url)
        req.add_header("X-Node-Pubkey", pubkey_hex)
        req.add_header("X-Node-Signature", sig_hex)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception:
        return None


@dataclass
class PeerInfo:
    url: str
    pubkey: bytes
    last_seen: float = 0.0
    height: int = -1
    failed_pings: int = 0


class PeerStore:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.peers: dict[str, PeerInfo] = {}
        self._lock = threading.Lock()
        if self.path.exists():
            self._load()

    def add(self, url: str, pubkey: bytes, height: int = -1) -> None:
        with self._lock:
            if url in self.peers:
                self.peers[url].last_seen = time.time()
                self.peers[url].height = max(self.peers[url].height, height)
            else:
                self.peers[url] = PeerInfo(url=url, pubkey=pubkey, last_seen=time.time(), height=height)
            self._save()

    def remove(self, url: str) -> None:
        with self._lock:
            self.peers.pop(url, None)
            self._save()

    def get_by_pubkey(self, pubkey: bytes) -> PeerInfo | None:
        for p in self.peers.values():
            if p.pubkey == pubkey:
                return p
        return None

    def list(self) -> list[PeerInfo]:
        with self._lock:
            return list(self.peers.values())

    def prune_stale(self, max_age_sec: float = 300) -> int:
        now = time.time()
        stale = [url for url, p in self.peers.items() if now - p.last_seen > max_age_sec]
        with self._lock:
            for url in stale:
                del self.peers[url]
            if stale:
                self._save()
        return len(stale)

    def mark_seen(self, url: str, height: int = -1) -> None:
        with self._lock:
            if url in self.peers:
                self.peers[url].last_seen = time.time()
                self.peers[url].failed_pings = 0
                if height >= 0:
                    self.peers[url].height = height
                self._save()

    def increment_failed(self, url: str) -> int:
        with self._lock:
            if url in self.peers:
                self.peers[url].failed_pings += 1
                self._save()
                return self.peers[url].failed_pings
        return 0

    def _load(self) -> None:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            for entry in data.get("peers", []):
                url = entry["url"]
                self.peers[url] = PeerInfo(
                    url=url,
                    pubkey=bytes.fromhex(entry["pubkey"]),
                    last_seen=entry.get("last_seen", 0.0),
                    height=entry.get("height", -1),
                    failed_pings=entry.get("failed_pings", 0),
                )
        except Exception:
            self.peers = {}

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "peers": [
                {
                    "url": p.url,
                    "pubkey": p.pubkey.hex(),
                    "last_seen": p.last_seen,
                    "height": p.height,
                    "failed_pings": p.failed_pings,
                }
                for p in self.peers.values()
            ]
        }
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
        tmp.replace(self.path)


class GossipWorker:
    def __init__(
        self,
        identity: Ed25519Identity,
        peer_store: PeerStore,
        on_gossip: Callable[[TransactionHeader], None] | None = None,
        interval: float = 2.0,
        max_failed_pings: int = 3,
    ) -> None:
        self.identity = identity
        self.peer_store = peer_store
        self.on_gossip = on_gossip
        self.interval = interval
        self.max_failed_pings = max_failed_pings
        self._queue: list[bytes] = []
        self._lock = threading.Lock()
        self._seen: set[bytes] = set()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None:
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=3)
            self._thread = None

    def gossip(self, packed_transaction: bytes) -> None:
        tx_hash = sha256_bytes(packed_transaction)
        with self._lock:
            if tx_hash in self._seen:
                return
            self._seen.add(tx_hash)
            self._queue.append(packed_transaction)

    def _run(self) -> None:
        while not self._stop_event.is_set():
            self._flush_queue()
            self._heartbeat_peers()
            self._stop_event.wait(self.interval)

    def _flush_queue(self) -> None:
        with self._lock:
            batch = list(self._queue)
            self._queue.clear()
        for packed in batch:
            self._send_to_peers(packed)

    def _send_to_peers(self, packed: bytes) -> None:
        body = json.dumps({"transaction": packed.hex()}).encode("utf-8")
        for peer in self.peer_store.list():
            url = f"{peer.url.rstrip('/')}/v1/chain/gossip"
            try:
                req = urllib.request.Request(
                    url,
                    data=body,
                    headers={"Content-Type": "application/json", "User-Agent": "sp1d3r-p2p/0.1"},
                    method="POST",
                )
                pubkey_hex, sig_hex = sign_request(self.identity, "POST", url, body)
                req.add_header("X-Node-Pubkey", pubkey_hex)
                req.add_header("X-Node-Signature", sig_hex)
                with urllib.request.urlopen(req, timeout=5):
                    pass
                self.peer_store.mark_seen(peer.url)
            except Exception:
                fails = self.peer_store.increment_failed(peer.url)
                if fails >= self.max_failed_pings:
                    self.peer_store.remove(peer.url)

    def _heartbeat_peers(self) -> None:
        my_peers = [
            {"url": p.url, "pubkey": p.pubkey.hex(), "height": p.height}
            for p in self.peer_store.list()
        ]
        for peer in self.peer_store.list():
            url = f"{peer.url.rstrip('/')}/v1/chain/ping"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "sp1d3r-p2p/0.1"})
                pubkey_hex, sig_hex = sign_request(self.identity, "GET", url)
                req.add_header("X-Node-Pubkey", pubkey_hex)
                req.add_header("X-Node-Signature", sig_hex)
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                self.peer_store.mark_seen(peer.url, data.get("height", -1))
            except Exception:
                fails = self.peer_store.increment_failed(peer.url)
                if fails >= self.max_failed_pings:
                    self.peer_store.remove(peer.url)
            if my_peers:
                pex_url = f"{peer.url.rstrip('/')}/v1/chain/pex"
                try:
                    pex_body = json.dumps({"peers": my_peers}).encode("utf-8")
                    pex_req = urllib.request.Request(
                        pex_url, data=pex_body,
                        headers={"Content-Type": "application/json", "User-Agent": "sp1d3r-p2p/0.1"},
                        method="POST",
                    )
                    pex_pk, pex_sig = sign_request(self.identity, "POST", pex_url, pex_body)
                    pex_req.add_header("X-Node-Pubkey", pex_pk)
                    pex_req.add_header("X-Node-Signature", pex_sig)
                    with urllib.request.urlopen(pex_req, timeout=5) as resp:
                        pex_data = json.loads(resp.read().decode("utf-8"))
                    for remote_peer in pex_data.get("peers", []):
                        r_url = remote_peer.get("url", "")
                        r_pk = remote_peer.get("pubkey", "")
                        if r_url and r_pk:
                            try:
                                self.peer_store.add(r_url, bytes.fromhex(r_pk), remote_peer.get("height", -1))
                            except Exception:
                                pass
                except Exception:
                    pass
