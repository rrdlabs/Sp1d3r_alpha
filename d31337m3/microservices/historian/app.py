from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


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

DATA_DIR = Path(os.getenv("HISTORIAN_DATA_DIR", "/tmp/historian-data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "records.json"
ENCRYPTION_KEY = os.getenv("HISTORIAN_ENCRYPTION_KEY", "dev-only-key")


def _load_store() -> dict[str, Any]:
    if DB_PATH.exists():
        with DB_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    return {"records": {}, "brokers": {}, "templates": {}}


def _save_store(store: dict[str, Any]) -> None:
    with DB_PATH.open("w", encoding="utf-8") as handle:
        json.dump(store, handle, indent=2, sort_keys=True)


def _encrypt(value: str) -> str:
    return value.encode("utf-8").hex()


def _decrypt(value: str) -> str:
    return bytes.fromhex(value).decode("utf-8")


class HistorianHandler(CORSMixin, BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/health"):
            self._send(200, {"status": "ok"})
            return
        if self.path.startswith("/records/"):
            key = self.path.split("/", 2)[2]
            store = _load_store()
            record = store["records"].get(key)
            if record is None:
                self._send(404, {"error": "record_not_found"})
                return
            self._send(200, {"key": key, "value": _decrypt(record["value"])})
            return
        if self.path.startswith("/templates/"):
            name = self.path.split("/", 2)[2]
            store = _load_store()
            template = store["templates"].get(name)
            if template is None:
                self._send(404, {"error": "template_not_found"})
                return
            self._send(200, {"name": name, "body": template})
            return
        if self.path.startswith("/brokers/"):
            broker_name = self.path.split("/", 2)[2]
            store = _load_store()
            broker = store["brokers"].get(broker_name)
            if broker is None:
                self._send(404, {"error": "broker_not_found"})
                return
            self._send(200, {"broker": broker_name, "rows": broker})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/records":
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            store = _load_store()
            key = payload["key"]
            store["records"][key] = {"value": _encrypt(payload["value"])}
            _save_store(store)
            self._send(201, {"key": key, "status": "stored"})
            return
        if self.path == "/broker-import":
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            store = _load_store()
            broker_name = payload["broker_name"]
            rows = payload.get("rows", [])
            store["brokers"][broker_name] = rows
            _save_store(store)
            self._send(201, {"broker": broker_name, "rows": len(rows)})
            return
        if self.path == "/templates":
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            store = _load_store()
            store["templates"][payload["name"]] = payload["body"]
            _save_store(store)
            self._send(201, {"template": payload["name"], "status": "stored"})
            return
        self._send(404, {"error": "not_found"})

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _send(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", int(os.getenv("HISTORIAN_PORT", "8100"))), HistorianHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
