from __future__ import annotations

import json
import os
import time
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
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

DATA_DIR = Path(os.getenv("DIRECTOR_DATA_DIR", "/tmp/director-data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "director.json"


def _load_store() -> dict[str, Any]:
    if DB_PATH.exists():
        with DB_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    return {"services": {}, "traffic": {"frontends": {}}, "alerts": []}


def _save_store(store: dict[str, Any]) -> None:
    with DB_PATH.open("w", encoding="utf-8") as handle:
        json.dump(store, handle, indent=2, sort_keys=True)


LOGS_DIR = DATA_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

SERVICE_CONTAINER_MAP = {
    "cityhall": "microservices-cityhall-1",
    "director": "microservices-director-1",
    "historian": "microservices-historian-1",
    "lawyer": "microservices-lawyer-1",
    "inboxer": "microservices-inboxer-1",
    "picaso": "microservices-picaso-1",
    "spiderwire": "microservices-spiderwire-1",
    "sp1d3r": "microservices-sp1d3r-1",
}

def _read_service_logs(service_name: str, line_count: int) -> list[str]:
    container = SERVICE_CONTAINER_MAP.get(service_name)
    if container:
        try:
            req = urllib.request.Request(
                f"http://localhost/containers/{container}/logs?tail={line_count}&stdout=true&stderr=true",
            )
            # Use Docker socket
            import socket
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.connect("/var/run/docker.sock")
            sock.sendall(f"GET /containers/{container}/logs?tail={line_count}&stdout=true&stderr=true HTTP/1.0\r\nHost: localhost\r\n\r\n".encode())
            data = b""
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                data += chunk
            sock.close()
            # Parse HTTP response body (skip headers)
            body_start = data.find(b"\r\n\r\n")
            if body_start >= 0:
                body = data[body_start + 4:]
            else:
                body = data
            # Docker log frames have 8-byte headers per frame
            lines = []
            i = 0
            while i < len(body):
                if i + 8 > len(body):
                    break
                frame_size = int.from_bytes(body[i + 4:i + 8], "big")
                frame_data = body[i + 8:i + 8 + frame_size]
                lines.extend(frame_data.decode("utf-8", errors="replace").splitlines())
                i += 8 + frame_size
            return lines[-line_count:] if lines else [f"[director] No log output from {service_name}"]
        except Exception:
            pass
    log_file = LOGS_DIR / f"{service_name}.log"
    if log_file.exists():
        file_lines = log_file.read_text(encoding="utf-8").splitlines()
        return file_lines[-line_count:]
    return [f"[director] No logs available for {service_name}"]


class DirectorHandler(CORSMixin, BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        path = self._normal_path()
        if path == "/health":
            self._send(200, {"status": "ok", "services": len(_load_store()["services"])})
            return
        if path == "/services":
            store = _load_store()
            self._send(200, {"services": list(store["services"].values())})
            return
        if path.startswith("/services/"):
            name = path.split("/", 2)[2]
            store = _load_store()
            service = store["services"].get(name)
            if service is None:
                self._send(404, {"error": "service_not_found"})
                return
            self._send(200, {"service": service})
            return
        if path == "/traffic/frontend":
            store = _load_store()
            self._send(200, {"traffic": store["traffic"]["frontends"]})
            return
        if path == "/alerts":
            store = _load_store()
            self._send(200, {"alerts": store["alerts"]})
            return
        if path.startswith("/logs/"):
            service_name = path.split("/", 2)[2]
            qs = self.path.split("?", 1)[1] if "?" in self.path else ""
            line_count = 50
            for part in qs.split("&"):
                if part.startswith("lines="):
                    try:
                        line_count = min(int(part.split("=", 1)[1]), 500)
                    except ValueError:
                        pass
            log_lines = _read_service_logs(service_name, line_count)
            self._send(200, {"lines": log_lines})
            return
        if path == "/platform-health":
            SERVICE_HEALTH_MAP = {
                "cityhall": "http://172.17.0.1:8000/health",
                "historian": "http://historian:8100/health",
                "lawyer": "http://lawyer:8200/health",
                "inboxer": "http://inboxer:8300/health",
                "director": "http://director:8400/health",
                "picaso": "http://picaso:8500/health",
                "spiderwire": "http://spiderwire:8600/health",
                "sp1d3r": "http://sp1d3r:9000/health",
            }
            results = {}
            for svc_name, url in SERVICE_HEALTH_MAP.items():
                try:
                    req = urllib.request.Request(url)
                    resp = urllib.request.urlopen(req, timeout=3)
                    data = json.loads(resp.read().decode("utf-8"))
                    results[svc_name] = {"healthy": True, "status": data.get("status", "ok"), "data": data}
                except Exception as e:
                    results[svc_name] = {"healthy": False, "status": "unreachable", "error": str(e)}
            healthy_count = sum(1 for r in results.values() if r["healthy"])
            self._send(200, {
                "services": results,
                "total": len(results),
                "healthy": healthy_count,
                "degraded": len(results) - healthy_count,
                "platform_status": "healthy" if healthy_count == len(results) else "degraded" if healthy_count > 0 else "offline",
            })
            return
        if path == "/blacklist":
            store = _load_store()
            blacklist = store.get("blacklist", [])
            self._send(200, {"blacklist": blacklist})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        path = self._normal_path()
        if path == "/services":
            payload = self._read_json()
            store = _load_store()
            service_name = payload["name"]
            service = store["services"].setdefault(service_name, {
                "name": service_name,
                "status": "running",
                "healthy": True,
                "failures": 0,
                "restart_count": 0,
                "last_seen": int(time.time()),
            })
            service.update({
                "url": payload.get("url", service.get("url")),
                "kind": payload.get("kind", service.get("kind", "service")),
                "status": payload.get("status", service.get("status", "running")),
                "healthy": bool(payload.get("healthy", service.get("healthy", True))),
                "last_seen": int(time.time()),
            })
            _save_store(store)
            self._send(201, {"service": service})
            return
        if path.startswith("/services/") and path.endswith("/heartbeat"):
            name = path.split("/", 2)[2].split("/", 1)[0]
            payload = self._read_json()
            store = _load_store()
            service = store["services"].setdefault(name, {"name": name, "status": "running", "healthy": True, "failures": 0, "restart_count": 0, "last_seen": int(time.time())})
            service["healthy"] = bool(payload.get("healthy", True))
            service["status"] = payload.get("status", "running" if service["healthy"] else "degraded")
            service["last_seen"] = int(time.time())
            if not service["healthy"]:
                service["failures"] = int(service.get("failures", 0)) + 1
            else:
                service["failures"] = 0
            _save_store(store)
            self._send(200, {"service": service})
            return
        if path.startswith("/services/") and path.endswith("/health"):
            name = path.split("/", 2)[2].split("/", 1)[0]
            payload = self._read_json()
            store = _load_store()
            service = store["services"].setdefault(name, {"name": name, "status": "running", "healthy": True, "failures": 0, "restart_count": 0, "last_seen": int(time.time())})
            healthy = bool(payload.get("healthy", True))
            service["healthy"] = healthy
            service["status"] = payload.get("status", "running" if healthy else "degraded")
            service["last_seen"] = int(time.time())
            if healthy:
                service["failures"] = 0
            else:
                service["failures"] = int(service.get("failures", 0)) + 1
            _save_store(store)
            self._send(200, {"service": service})
            return
        if path.startswith("/services/") and path.endswith("/alert"):
            name = path.split("/", 2)[2].split("/", 1)[0]
            payload = self._read_json()
            store = _load_store()
            store["alerts"].append({"service": name, "message": payload.get("message", "alert"), "at": int(time.time())})
            _save_store(store)
            self._send(201, {"status": "recorded"})
            return
        if path == "/traffic/frontend":
            payload = self._read_json()
            store = _load_store()
            traffic = store["traffic"].setdefault("frontends", {})
            service_name = payload.get("service", "frontend")
            entry = traffic.setdefault(service_name, {"service": service_name, "requests": 0, "last_seen": int(time.time()), "paths": {}})
            entry["requests"] = int(entry.get("requests", 0)) + int(payload.get("requests", 1))
            entry["last_seen"] = int(time.time())
            entry.setdefault("paths", {})
            entry["paths"][payload.get("path", "/")] = int(entry["paths"].get(payload.get("path", "/"), 0)) + 1
            if payload.get("status"):
                entry["last_status"] = payload["status"]
            _save_store(store)
            self._send(201, {"traffic": entry})
            return
        if path == "/reconcile":
            store = _load_store()
            threshold = int(os.getenv("DIRECTOR_RESTART_THRESHOLD", "2"))
            for service in store["services"].values():
                if not service.get("healthy", True) and int(service.get("failures", 0)) >= threshold:
                    service["status"] = "restarting"
                    service["restart_count"] = int(service.get("restart_count", 0)) + 1
                    store["alerts"].append({"service": service["name"], "message": "restarting after failures", "at": int(time.time())})
            _save_store(store)
            self._send(200, {"status": "reconciled", "services": list(store["services"].values())})
            return
        if path == "/blacklist":
            payload = self._read_json()
            store = _load_store()
            blacklist = store.setdefault("blacklist", [])
            entry = {
                "id": len(blacklist) + 1,
                "ip_address": payload["ip_address"],
                "reason": payload.get("reason", ""),
                "added_by": payload.get("added_by", "admin"),
                "shared_with_nodes": payload.get("shared_with_nodes", True),
                "created_at": int(time.time()),
            }
            blacklist.append(entry)
            _save_store(store)
            self._send(201, {"status": "added", "entry": entry})
            return
        self._send(404, {"error": "not_found"})

    def do_DELETE(self) -> None:  # noqa: N802
        path = self._normal_path()
        if path.startswith("/blacklist/"):
            try:
                entry_id = int(path.split("/")[2])
            except (ValueError, IndexError):
                self._send(400, {"error": "invalid_id"})
                return
            store = _load_store()
            blacklist = store.get("blacklist", [])
            store["blacklist"] = [e for e in blacklist if e.get("id") != entry_id]
            _save_store(store)
            self._send(200, {"status": "removed"})
            return
        self._send(404, {"error": "not_found"})

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _normal_path(self) -> str:
        return self.path.split("?", 1)[0]

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


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", int(os.getenv("DIRECTOR_PORT", "8400"))), DirectorHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
