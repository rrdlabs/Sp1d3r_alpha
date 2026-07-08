from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import urllib.request

HISTORIAN_URL = os.getenv("HISTORIAN_URL", "http://127.0.0.1:8100")


def _fetch_template(name: str) -> str:
    historian_url = os.getenv("HISTORIAN_URL", HISTORIAN_URL)
    with urllib.request.urlopen(f"{historian_url}/templates/{name}") as response:
        payload = json.load(response)
    return payload["body"]


def _fetch_broker(broker_name: str) -> list[dict[str, Any]]:
    historian_url = os.getenv("HISTORIAN_URL", HISTORIAN_URL)
    with urllib.request.urlopen(f"{historian_url}/brokers/{broker_name}") as response:
        payload = json.load(response)
    return payload.get("rows", [])


class LawyerHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/health"):
            self._send(200, {"status": "ok"})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/documents/generate":
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            template_name = payload["template_name"]
            template_body = _fetch_template(template_name)
            broker_name = payload.get("broker_name", "default")
            broker_rows = _fetch_broker(broker_name)
            filled = template_body.format(
                client_name=payload.get("client_name", "Client"),
                broker_name=broker_name,
                broker_details=json.dumps(broker_rows, indent=2),
                signature="[digital-signature]",
            )
            self._send(201, {"document": filled, "template": template_name, "broker_rows": len(broker_rows)})
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
    server = ThreadingHTTPServer(("0.0.0.0", int(os.getenv("LAWYER_PORT", "8200"))), LawyerHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
