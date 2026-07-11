from __future__ import annotations

import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


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


HISTORIAN_URL = os.getenv("HISTORIAN_URL", "http://127.0.0.1:8100")


def _historian_request(method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{HISTORIAN_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    if body:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def _fetch_template(name: str) -> str:
    payload = _historian_request("GET", f"/templates/{name}")
    return payload["body"]


def _fetch_broker(broker_name: str) -> list[dict[str, Any]]:
    payload = _historian_request("GET", f"/brokers/{broker_name}")
    return payload.get("rows", [])


class LawyerHandler(CORSMixin, BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path == "/health":
            self._send(200, {"status": "ok"})
            return
        if path == "/templates":
            try:
                payload = _historian_request("GET", "/templates")
                self._send(200, {"templates": payload.get("templates", []), "count": payload.get("count", 0)})
            except Exception as e:
                self._send(502, {"error": "historian_unreachable", "detail": str(e)})
            return
        if path.startswith("/templates/"):
            name = path.split("/", 2)[2]
            try:
                payload = _historian_request("GET", f"/templates/{name}")
                self._send(200, payload)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    self._send(404, {"error": "template_not_found"})
                else:
                    self._send(502, {"error": "historian_error"})
            except Exception as e:
                self._send(502, {"error": "historian_unreachable", "detail": str(e)})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}

        if path == "/templates":
            name = payload.get("name", "").strip()
            body = payload.get("body", "")
            if not name:
                self._send(400, {"error": "name_required"})
                return
            try:
                _historian_request("POST", "/templates", {"name": name, "body": body})
                self._send(201, {"status": "created", "name": name})
            except Exception as e:
                self._send(502, {"error": "historian_unreachable", "detail": str(e)})
            return
        if path == "/documents/generate":
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

    def do_PUT(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path.startswith("/templates/"):
            name = path.split("/", 2)[2]
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}
            body = payload.get("body", "")
            try:
                _historian_request("POST", "/templates", {"name": name, "body": body})
                self._send(200, {"status": "updated", "name": name})
            except Exception as e:
                self._send(502, {"error": "historian_unreachable", "detail": str(e)})
            return
        self._send(404, {"error": "not_found"})

    def do_DELETE(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path.startswith("/templates/"):
            name = path.split("/", 2)[2]
            try:
                _historian_request("DELETE", f"/templates/{name}")
                self._send(200, {"status": "deleted", "name": name})
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    self._send(404, {"error": "template_not_found"})
                else:
                    self._send(502, {"error": "historian_error"})
            except Exception as e:
                self._send(502, {"error": "historian_unreachable", "detail": str(e)})
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
