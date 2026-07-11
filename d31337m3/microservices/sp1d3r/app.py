from __future__ import annotations

import json
import os
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from d31337m3_chain import (
    NODE_AUTH,
    PAYLOAD_COMMIT,
    AppChain,
    ChainConfig,
    Ed25519Identity,
    GENESIS_PREV_HASH,
    GossipWorker,
    PeerStore,
    TransactionHeader,
    fetch_json,
    sha256_bytes,
    sign_request,
    verify_signed_request,
)
from d31337m3_chain.transaction import TRANSACTION_SIZE
from d31337m3_crawler import CrawlerWorker, FindingStore, WorkerConfig

from task_queue import TaskQueue
from search_store import SearchStore


class CORSMixin:
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

HOST = os.getenv("SP1D3R_HOST", "0.0.0.0")
PORT = int(os.getenv("SP1D3R_PORT", "9000"))
DATA_DIR = Path(os.getenv("SP1D3R_DATA_DIR", "/tmp/sp1d3r-data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
CHAIN_STATE_PATH = DATA_DIR / "chain_state.json"
FINDINGS_DIR = DATA_DIR / "findings"
IDENTITY_PATH = DATA_DIR / "node_identity.hex"
PEERS_PATH = DATA_DIR / "peers.json"
SEED_NODE = os.getenv("SP1D3R_SEED_NODE", "")
GOSSIP_ENABLED = os.getenv("SP1D3R_GOSSIP_ENABLED", "true").lower() == "true"
DIRECTOR_URL = os.getenv("DIRECTOR_URL", "http://127.0.0.1:8400")


def _load_or_create_identity() -> Ed25519Identity:
    if IDENTITY_PATH.exists():
        seed = bytes.fromhex(IDENTITY_PATH.read_text(encoding="utf-8").strip())
        return Ed25519Identity.from_private_bytes(seed)
    identity = Ed25519Identity.generate()
    IDENTITY_PATH.write_text(identity.private_seed.hex(), encoding="utf-8")
    return identity


def _fetch_url(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


identity = _load_or_create_identity()
chain = AppChain(ChainConfig(), state_path=CHAIN_STATE_PATH)
worker = CrawlerWorker(WorkerConfig(max_workers=4), chain, identity)
store = FindingStore(FINDINGS_DIR)
peer_store = PeerStore(PEERS_PATH)

if identity.public_key not in chain.authenticated_nodes:
    auth_tx = TransactionHeader.create(NODE_AUTH, identity, sha256_bytes(b"sp1d3r-boot"))
    chain.submit(auth_tx)

gossip_worker = GossipWorker(identity, peer_store, interval=2.0)
task_queue = TaskQueue(DATA_DIR)
search_store = SearchStore(DATA_DIR)


def _sync_from_seed(seed_url: str) -> bool:
    seed_url = seed_url.rstrip("/")
    snapshot = fetch_json(f"{seed_url}/v1/chain/snapshot", identity)
    if snapshot is None:
        print(f"[sync] FAILED to fetch snapshot from {seed_url}", flush=True)
        return False
    if snapshot.get("chain_id") != chain.config.chain_id:
        print(f"[sync] chain_id mismatch: seed={snapshot.get('chain_id')} local={chain.config.chain_id}", flush=True)
        return False
    if bytes.fromhex(snapshot.get("genesis_prev_hash", "")) != GENESIS_PREV_HASH:
        print("[sync] genesis_prev_hash mismatch", flush=True)
        return False

    seed_height = snapshot.get("height", -1)
    local_height = chain.height
    if seed_height <= local_height:
        print(f"[sync] already at tip (local={local_height} seed={seed_height})", flush=True)
        return True

    blocks_data = fetch_json(f"{seed_url}/v1/chain/blocks?since={local_height}", identity)
    if blocks_data is None:
        print("[sync] FAILED to fetch blocks from seed", flush=True)
        return False

    packed_hex_list: list[str] = blocks_data.get("blocks", [])
    if not packed_hex_list:
        print("[sync] no blocks returned from seed", flush=True)
        return False

    packed_txs = [bytes.fromhex(h) for h in packed_hex_list]
    try:
        count = chain.import_blocks(packed_txs)
        print(f"[sync] imported {count} blocks from seed", flush=True)
        return True
    except ValueError as exc:
        print(f"[sync] block import FAILED: {exc}", flush=True)
        return False


def _gossip_callback(height: int, packed: bytes) -> None:
    if GOSSIP_ENABLED:
        gossip_worker.gossip(packed)


chain.on_commit(_gossip_callback)


def _verify_p2p(method: str, path: str, body: bytes) -> bytes | None:
    pubkey_hex = str(getattr(Sp1d3rHandler, "_p2p_pubkey_hex", ""))
    sig_hex = str(getattr(Sp1d3rHandler, "_p2p_sig_hex", ""))
    return verify_signed_request(pubkey_hex, sig_hex, method, path, body)


class Sp1d3rHandler(CORSMixin, BaseHTTPRequestHandler):
    _p2p_pubkey_hex: str = ""
    _p2p_sig_hex: str = ""

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/health":
            self._send(200, {
                "status": "ok",
                "service": "sp1d3r",
                "chain_blocks": len(chain.blocks),
                "authenticated_nodes": len(chain.authenticated_nodes),
                "payload_roots": len(chain.payload_roots),
                "findings_stored": len(store.list_hashes()),
                "peers": len(peer_store.list()),
                "height": chain.height,
            })
            return

        if path == "/v1/chain/state":
            self._send(200, {
                "blocks": len(chain.blocks),
                "authenticated_nodes": len(chain.authenticated_nodes),
                "approved_app_hashes": len(chain.approved_app_hashes),
                "payload_roots": len(chain.payload_roots),
                "events": len(chain.events),
                "height": chain.height,
            })
            return

        if path == "/v1/chain/snapshot":
            self._p2p_sign_response(200, chain.export_snapshot())
            return

        if path == "/v1/chain/blocks":
            since = int(query.get("since", ["-1"])[0])
            blocks = chain.blocks_since(since)
            self._p2p_sign_response(200, {
                "blocks": [t.hex() for t in blocks],
                "since": since,
                "tip_height": chain.height,
            })
            return

        if path == "/v1/chain/peers":
            peer_list = [
                {"url": p.url, "pubkey": p.pubkey.hex(), "height": p.height, "last_seen": p.last_seen}
                for p in peer_store.list()
            ]
            self._p2p_sign_response(200, {"peers": peer_list})
            return

        if path == "/v1/chain/ping":
            self._p2p_sign_response(200, {
                "status": "pong",
                "height": chain.height,
                "timestamp": time.time(),
            })
            return

        if path == "/v1/chain/sync":
            tip_hash = chain.blocks[-1].hex() if chain.blocks else ""
            self._send(200, {
                "height": chain.height,
                "tip_hash": tip_hash,
                "local_height": chain.height,
                "peers_known": len(peer_store.list()),
                "gossip_enabled": GOSSIP_ENABLED,
            })
            return

        if path == "/v1/tasks/pending":
            pubkey = self.headers.get("X-Node-Pubkey", "")
            if not pubkey:
                self._send(400, {"error": "X-Node-Pubkey header required"})
                return
            task = task_queue.assign_next(pubkey)
            if task is None:
                self._send(200, {"status": "no_tasks"})
            else:
                self._send(200, {"status": "assigned", "task": task.to_dict()})
            return

        if path == "/v1/tasks":
            status_filter = query.get("status", [None])[0]
            tasks = task_queue.list_tasks(status=status_filter)
            self._send(200, {"tasks": [t.to_dict() for t in tasks]})
            return

        if path.startswith("/v1/tasks/") and path != "/v1/tasks/pending" and path != "/v1/tasks/create" and path != "/v1/tasks/result":
            task_id = path[len("/v1/tasks/"):]
            task = task_queue.get_task(task_id)
            if task is None:
                self._send(404, {"error": "task_not_found"})
            else:
                self._send(200, task.to_dict())
            return

        if path.startswith("/v1/search/") and path.endswith("/results"):
            search_id = path.split("/")[3]
            search = search_store.get(search_id)
            if search is None:
                self._send(404, {"error": "search_not_found"})
                return
            requester_pubkey = self.headers.get("X-Requester-Pubkey", "")
            if requester_pubkey and requester_pubkey != search.recipient_pubkey:
                self._send(403, {"error": "not_authorized"})
                return
            search_store.check_completion(search_id, task_queue)
            self._send(200, {
                "search_id": search.id,
                "status": search.status,
                "results": search.results,
                "failures": search.failures,
                "created_at": search.created_at,
                "completed_at": search.completed_at,
            })
            return

        if path.startswith("/v1/search/") and not path.endswith("/results"):
            search_id = path.split("/")[3]
            search = search_store.get(search_id)
            if search is None:
                self._send(404, {"error": "search_not_found"})
                return
            requester_pubkey = self.headers.get("X-Requester-Pubkey", "")
            if requester_pubkey and requester_pubkey != search.recipient_pubkey:
                self._send(403, {"error": "not_authorized"})
                return
            search_store.check_completion(search_id, task_queue)
            self._send(200, search.to_dict())
            return

        if path == "/v1/searches":
            requester_pubkey = self.headers.get("X-Requester-Pubkey", "")
            if not requester_pubkey:
                self._send(400, {"error": "X-Requester-Pubkey header required"})
                return
            searches = search_store.list_by_pubkey(requester_pubkey)
            self._send(200, {
                "searches": [s.to_dict() for s in searches],
                "total": len(searches),
            })
            return

        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/v1/crawl":
            payload = self._read_json()
            urls: list[str] = payload.get("urls", [])
            recipient_pubkey_hex: str = payload.get("recipient_public_key", "")
            if not urls:
                self._send(400, {"error": "no_urls_provided"})
                return
            if not recipient_pubkey_hex:
                self._send(400, {"error": "recipient_public_key_required"})
                return
            recipient_pubkey = bytes.fromhex(recipient_pubkey_hex)
            results: list[dict[str, Any]] = []
            failures: list[dict[str, Any]] = []
            for url in urls:
                try:
                    page_content = _fetch_url(url)
                    finding = worker.encrypt_payload(page_content, recipient_pubkey)
                    tx = TransactionHeader.create(
                        PAYLOAD_COMMIT,
                        identity,
                        finding.payload_hash,
                        finding.merkle_root,
                    )
                    chain.submit(tx)
                    store.save(finding, metadata={"url": url, "fetched_at": time.time()})
                    results.append({
                        "url": url,
                        "payload_hash": finding.payload_hash.hex(),
                        "merkle_root": finding.merkle_root.hex(),
                    })
                except Exception as exc:
                    failures.append({"url": url, "error": str(exc)})
            self._send(200, {
                "status": "ok",
                "service": "sp1d3r",
                "task_id": f"task-{int(time.time())}",
                "results": results,
                "failures": failures,
            })
            return

        if path == "/v1/chain/peers":
            payload = self._read_json()
            peer_url = payload.get("url", "")
            peer_pubkey_hex = payload.get("pubkey", "")
            if not peer_url or not peer_pubkey_hex:
                self._send(400, {"error": "url_and_pubkey_required"})
                return
            peer_store.add(peer_url, bytes.fromhex(peer_pubkey_hex))
            self._send(200, {"status": "peer_added", "url": peer_url})
            return

        if path == "/v1/chain/gossip":
            payload = self._read_json()
            packed_hex = payload.get("transaction", "")
            if not packed_hex:
                self._send(400, {"error": "transaction_required"})
                return
            packed = bytes.fromhex(packed_hex)
            if len(packed) != TRANSACTION_SIZE:
                self._send(400, {"error": "invalid_transaction_size"})
                return
            tx = TransactionHeader.unpack(packed)
            if not tx.signature_is_valid():
                self._send(400, {"error": "invalid_signature"})
                return
            event = chain.submit(tx)
            if event.level == "critical":
                self._send(400, {"error": event.message})
                return
            self._send(200, {"status": "gossip_accepted", "code": event.code})
            return

        if path == "/v1/tasks/result":
            payload = self._read_json()
            task_id = payload.get("task_id", "")
            task = task_queue.get_task(task_id)
            if task is None:
                self._send(404, {"error": "task_not_found"})
                return
            results: list[dict[str, Any]] = []
            failures: list[dict[str, Any]] = []
            recipient_pubkey = bytes.fromhex(task.recipient_pubkey)
            for url in task.urls:
                try:
                    page_content = _fetch_url(url)
                    finding = worker.encrypt_payload(page_content, recipient_pubkey)
                    tx = TransactionHeader.create(
                        PAYLOAD_COMMIT,
                        identity,
                        finding.payload_hash,
                        finding.merkle_root,
                    )
                    chain.submit(tx)
                    store.save(finding, metadata={"url": url, "fetched_at": time.time()})
                    result_entry = {
                        "url": url,
                        "payload_hash": finding.payload_hash.hex(),
                        "merkle_root": finding.merkle_root.hex(),
                        "ephemeral_public_key": finding.ephemeral_public_key.hex(),
                        "nonce": finding.nonce.hex(),
                        "ciphertext": finding.ciphertext.hex(),
                    }
                    results.append(result_entry)
                    for search in search_store.list_by_pubkey(task.recipient_pubkey):
                        if task_id in search.task_ids:
                            search_store.add_result(search.id, result_entry)
                except Exception as exc:
                    failure_entry = {"url": url, "error": str(exc)}
                    failures.append(failure_entry)
                    for search in search_store.list_by_pubkey(task.recipient_pubkey):
                        if task_id in search.task_ids:
                            search_store.add_failure(search.id, failure_entry)
            task_queue.complete(task_id, results, failures)
            for search in search_store.list_by_pubkey(task.recipient_pubkey):
                if task_id in search.task_ids:
                    search_store.check_completion(search.id, task_queue)
            print(
                f"[task] completed task={task_id} results={len(results)} failures={len(failures)}",
                flush=True,
            )
            self._send(200, {
                "status": "completed",
                "task_id": task_id,
                "results": results,
                "failures": failures,
            })
            return

        if path == "/v1/tasks/create":
            payload = self._read_json()
            task_type = payload.get("type", "crawl")
            urls = payload.get("urls", [])
            recipient_pubkey_hex = payload.get("recipient_pubkey", "")
            if not urls:
                self._send(400, {"error": "urls_required"})
                return
            if not recipient_pubkey_hex:
                self._send(400, {"error": "recipient_pubkey_required"})
                return
            task = task_queue.create(task_type, urls, recipient_pubkey_hex)
            self._send(201, task.to_dict())
            return

        if path == "/v1/search":
            payload = self._read_json()
            query = payload.get("query", "")
            urls = payload.get("urls", [])
            recipient_pubkey_hex = payload.get("recipient_pubkey", "")
            if not urls:
                self._send(400, {"error": "urls_required"})
                return
            if not recipient_pubkey_hex:
                self._send(400, {"error": "recipient_pubkey_required"})
                return
            search = search_store.create(query, urls, recipient_pubkey_hex)
            for url in urls:
                task = task_queue.create("crawl", [url], recipient_pubkey_hex)
                search_store.add_task(search.id, task.id)
            print(
                f"[search] created search={search.id} urls={len(urls)} tasks={len(search.task_ids)}",
                flush=True,
            )
            self._send(201, search.to_dict())
            return

        self._send(404, {"error": "not_found"})

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def _p2p_sign_response(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        sig = identity.sign(sha256_bytes(b"GET " + self.path.encode() + body))
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Node-Pubkey", identity.public_key.hex())
        self.send_header("X-Node-Signature", sig.hex())
        self.end_headers()
        self.wfile.write(body)

    def _send(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _register_with_director() -> None:
    try:
        req = urllib.request.Request(
            f"{DIRECTOR_URL}/services",
            data=json.dumps({
                "name": "sp1d3r",
                "url": f"http://{HOST}:{PORT}",
                "kind": "chain",
                "healthy": True,
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=2):
            pass
    except Exception:
        pass


def main() -> None:
    if SEED_NODE:
        print(f"[boot] syncing from seed: {SEED_NODE}", flush=True)
        ok = _sync_from_seed(SEED_NODE)
        if not ok:
            print("[boot] seed sync FAILED — starting anyway with local chain", flush=True)
        else:
            print("[boot] seed sync complete", flush=True)
    _register_with_director()
    if GOSSIP_ENABLED:
        gossip_worker.start()
        print("[boot] gossip worker started", flush=True)
    server = ThreadingHTTPServer((HOST, PORT), Sp1d3rHandler)
    print(f"[boot] sp1d3r listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
