from __future__ import annotations

import json
import os
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from d31337m3_chain import NODE_AUTH, PAYLOAD_COMMIT, AppChain, ChainConfig, Ed25519Identity, TransactionHeader, sha256_bytes
from d31337m3_crawler import CrawlerWorker, FindingStore, WorkerConfig

HOST = os.getenv("SP1D3R_HOST", "0.0.0.0")
PORT = int(os.getenv("SP1D3R_PORT", "9000"))
DATA_DIR = Path(os.getenv("SP1D3R_DATA_DIR", "/tmp/sp1d3r-data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
CHAIN_STATE_PATH = DATA_DIR / "chain_state.json"
FINDINGS_DIR = DATA_DIR / "findings"
IDENTITY_PATH = DATA_DIR / "node_identity.hex"
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

if identity.public_key not in chain.authenticated_nodes:
    auth_tx = TransactionHeader.create(NODE_AUTH, identity, sha256_bytes(b"sp1d3r-boot"))
    chain.submit(auth_tx)


class Sp1d3rHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send(200, {
                "status": "ok",
                "service": "sp1d3r",
                "chain_blocks": len(chain.blocks),
                "authenticated_nodes": len(chain.authenticated_nodes),
                "payload_roots": len(chain.payload_roots),
                "findings_stored": len(store.list_hashes()),
            })
            return
        if self.path == "/v1/chain/state":
            self._send(200, {
                "blocks": len(chain.blocks),
                "authenticated_nodes": len(chain.authenticated_nodes),
                "approved_app_hashes": len(chain.approved_app_hashes),
                "payload_roots": len(chain.payload_roots),
                "events": len(chain.events),
            })
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/v1/crawl":
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
        self._send(404, {"error": "not_found"})

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

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
    _register_with_director()
    server = ThreadingHTTPServer((HOST, PORT), Sp1d3rHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
