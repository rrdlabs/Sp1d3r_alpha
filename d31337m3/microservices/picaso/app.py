from __future__ import annotations

import cgi
import json
import mimetypes
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.getenv("PICASO_DATA_DIR", "/tmp/picaso-data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_ROOT = DATA_DIR / "frontends"
FRONTEND_ROOT.mkdir(parents=True, exist_ok=True)
DIRECTOR_URL = os.getenv("DIRECTOR_URL", "http://127.0.0.1:8400")


class PicasoHandler(BaseHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:  # noqa: ANN401
        self._state = {"status": "running", "restarts": 0, "failures": 0, "traffic": {}}
        super().__init__(*args, **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        path = self._normal_path()
        if path in {"/", "/frontends"}:
            self._send(200, {"status": "ok", "frontends": self._list_frontends(), "service": self._state})
            self._report_traffic("GET", path, 200)
            return
        if path.startswith("/frontends/"):
            relative_path = path[len("/frontends/"):]
            target = FRONTEND_ROOT / relative_path
            if target.exists() and target.is_file():
                self._send_file(target)
                self._report_traffic("GET", path, 200)
                return
            self._send(404, {"error": "frontend_not_found"})
            self._report_traffic("GET", path, 404)
            return
        if path == "/health":
            self._send(200, {"status": self._state["status"], "restarts": self._state["restarts"], "failures": self._state["failures"]})
            self._report_traffic("GET", path, 200)
            return
        self._send(404, {"error": "not_found"})
        self._report_traffic("GET", path, 404)

    def do_POST(self) -> None:  # noqa: N802
        path = self._normal_path()
        if path == "/uploads":
            payload = self._read_upload_payload()
            target_path = self._store_frontend(payload)
            self._send(201, {"status": "uploaded", "path": target_path})
            self._report_traffic("POST", path, 201)
            return
        if path == "/health/report":
            payload = self._read_json()
            self._handle_health_report(payload)
            self._report_traffic("POST", path, 200)
            return
        if path == "/restart":
            self._state["status"] = "running"
            self._state["restarts"] = int(self._state.get("restarts", 0)) + 1
            self._send(200, {"status": "restarted", "restarts": self._state["restarts"]})
            self._report_traffic("POST", path, 200)
            return
        self._send(404, {"error": "not_found"})
        self._report_traffic("POST", path, 404)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _normal_path(self) -> str:
        return self.path.split("?", 1)[0]

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def _read_upload_payload(self) -> dict[str, Any]:
        content_type = self.headers.get("Content-Type", "")
        if content_type.startswith("multipart/form-data"):
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": content_type})
            file_item = form["file"] if "file" in form else None
            if file_item is not None and not isinstance(file_item, list):
                path = form.getvalue("path") or file_item.filename or "index.html"
                content = file_item.file.read()
                return {"path": path, "content": content, "is_binary": True}
        return self._read_json()

    def _store_frontend(self, payload: dict[str, Any]) -> str:
        path = payload.get("path", "index.html")
        target = FRONTEND_ROOT / path.lstrip("/")
        target.parent.mkdir(parents=True, exist_ok=True)
        if payload.get("is_binary"):
            target.write_bytes(payload["content"])
        else:
            target.write_text(payload.get("content", ""), encoding="utf-8")
        return target.relative_to(FRONTEND_ROOT).as_posix()

    def _list_frontends(self) -> list[str]:
        return [path.relative_to(FRONTEND_ROOT).as_posix() for path in sorted(FRONTEND_ROOT.rglob("*")) if path.is_file()]

    def _send_file(self, target: Path) -> None:
        content = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _send(self, status: int, payload: Any) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_health_report(self, payload: dict[str, Any]) -> None:
        if payload.get("status") not in {"ok", "healthy"}:
            self._state["failures"] = int(self._state.get("failures", 0)) + 1
            threshold = int(os.getenv("PICASO_RESTART_THRESHOLD", "2"))
            if self._state["failures"] >= threshold:
                self._state["status"] = "restarting"
                self._state["restarts"] = int(self._state.get("restarts", 0)) + 1
                self._state["failures"] = 0
                self._send(200, {"status": self._state["status"], "restarts": self._state["restarts"]})
                return
        else:
            self._state["status"] = "running"
            self._state["failures"] = 0
        self._send(200, {"status": self._state["status"], "restarts": self._state["restarts"], "failures": self._state["failures"]})

    def _report_traffic(self, method: str, path: str, status: int) -> None:
        payload = {"service": "picaso", "method": method, "path": path, "status": status, "requests": 1}
        try:
            req = urllib.request.Request(
                f"{DIRECTOR_URL}/traffic/frontend",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=2):
                pass
        except Exception:
            return


def _register_with_director() -> None:
    try:
        req = urllib.request.Request(
            f"{DIRECTOR_URL}/services",
            data=json.dumps({"name": "picaso", "url": "http://127.0.0.1:8500", "kind": "frontend", "healthy": True}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=2):
            pass
    except Exception:
        return


def main() -> None:
    _register_with_director()
    server = ThreadingHTTPServer(("0.0.0.0", int(os.getenv("PICASO_PORT", "8500"))), PicasoHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
