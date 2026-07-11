from __future__ import annotations

import json
import logging
import os
import smtplib
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from pathlib import Path
from typing import Any

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [inboxer] %(message)s")
log = logging.getLogger("inboxer")


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

DATA_DIR = Path(os.getenv("INBOXER_DATA_DIR", "/tmp/inboxer-data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "inboxer.sqlite3"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, sender TEXT NOT NULL, recipient TEXT NOT NULL, body TEXT NOT NULL, metadata TEXT NOT NULL, archived INTEGER DEFAULT 0)")
    conn.execute("CREATE TABLE IF NOT EXISTS mailouts (id INTEGER PRIMARY KEY AUTOINCREMENT, to_address TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, provider TEXT NOT NULL)")
    return conn


SETTINGS_PATH = DATA_DIR / "settings.json"

def _load_settings() -> dict[str, Any]:
    if SETTINGS_PATH.exists():
        with SETTINGS_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    return {
        "host": os.getenv("INBOXER_SMTP_HOST", "localhost"),
        "port": os.getenv("INBOXER_SMTP_PORT", "25"),
        "username": os.getenv("INBOXER_SMTP_USERNAME", ""),
        "password": os.getenv("INBOXER_SMTP_PASSWORD", ""),
        "from_address": os.getenv("INBOXER_SMTP_FROM", "no-reply@example.com"),
        "use_tls": True,
    }

def _save_settings(settings: dict[str, Any]) -> None:
    with SETTINGS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(settings, handle, indent=2)


def _send_api_mail(payload: dict[str, Any], settings: dict[str, Any]) -> str:
    api_provider = settings.get("api_provider", "")
    api_key = settings.get("api_key", "")
    sender = settings.get("from_address", "no-reply@example.com")
    if not api_provider or not api_key:
        return ""

    to = payload["to_address"]
    subject = payload.get("subject", "Inboxer message")
    body = payload.get("body", "")

    if api_provider == "sendgrid":
        data = json.dumps({
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": sender},
            "subject": subject,
            "content": [{"type": "text/plain", "value": body}],
        }).encode()
        req = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
    elif api_provider == "mailgun":
        data = urllib.parse.urlencode({
            "from": sender,
            "to": to,
            "subject": subject,
            "text": body,
        }).encode()
        domain = settings.get("mailgun_domain", "")
        req = urllib.request.Request(
            f"https://api.mailgun.net/v3/{domain}/messages",
            data=data,
            headers={"Authorization": f"Basic {api_key}"},
        )
    elif api_provider == "resend":
        data = json.dumps({
            "from": sender,
            "to": [to],
            "subject": subject,
            "text": body,
        }).encode()
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
    else:
        return ""

    try:
        resp = urllib.request.urlopen(req, timeout=15)
        if resp.status in (200, 201, 202):
            log.info("API mail sent to %s via %s", to, api_provider)
            return "sent"
        log.error("API mail returned %d for %s", resp.status, to)
        return "queued"
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode() if exc.fp else str(exc)
        log.error("API mail failed for %s: %d %s", to, exc.code, error_body[:200])
        return "queued"
    except Exception as exc:
        log.error("API mail failed for %s: %s", to, exc)
        return "queued"


def _send_smtp_mail(payload: dict[str, Any]) -> str:
    settings = _load_settings()
    sender = settings.get("from_address", "no-reply@example.com")

    api_result = _send_api_mail(payload, settings)
    if api_result:
        return api_result

    host = settings.get("host", "localhost")
    port = int(settings.get("port", "25"))
    username = settings.get("username") or None
    password = settings.get("password") or None
    use_tls = settings.get("use_tls", True)

    message = EmailMessage()
    message["Subject"] = payload.get("subject", "Inboxer message")
    message["From"] = sender
    message["To"] = payload["to_address"]
    message.set_content(payload.get("body", ""))

    try:
        if port == 465:
            smtp = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            smtp = smtplib.SMTP(host, port, timeout=15)
            if use_tls:
                smtp.starttls()
        try:
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
            smtp.quit()
            log.info("SMTP mail sent to %s via %s:%d", payload["to_address"], host, port)
            return "sent"
        except Exception:
            smtp.quit()
            raise
    except Exception as exc:
        log.error("SMTP send failed for %s: %s", payload["to_address"], exc)
        return "queued"


def _retry_queued_emails() -> None:
    while True:
        time.sleep(60)
        try:
            with _connect() as conn:
                rows = conn.execute(
                    "SELECT id, to_address, subject, body FROM mailouts WHERE status = 'queued'"
                ).fetchall()
            if not rows:
                continue
            settings = _load_settings()
            sender = settings.get("from_address", "no-reply@example.com")
            host = settings.get("host", "localhost")
            port = int(settings.get("port", "25"))
            username = settings.get("username") or None
            password = settings.get("password") or None
            use_tls = settings.get("use_tls", True)
            for row in rows:
                payload = {"to_address": row["to_address"], "subject": row["subject"], "body": row["body"]}
                api_result = _send_api_mail(payload, settings)
                if api_result == "sent":
                    with _connect() as conn:
                        conn.execute("UPDATE mailouts SET status = 'sent' WHERE id = ?", (row["id"],))
                    continue
                message = EmailMessage()
                message["Subject"] = row["subject"]
                message["From"] = sender
                message["To"] = row["to_address"]
                message.set_content(row["body"])
                try:
                    if port == 465:
                        smtp = smtplib.SMTP_SSL(host, port, timeout=15)
                    else:
                        smtp = smtplib.SMTP(host, port, timeout=15)
                        if use_tls:
                            smtp.starttls()
                    if username and password:
                        smtp.login(username, password)
                    smtp.send_message(message)
                    smtp.quit()
                    with _connect() as conn:
                        conn.execute("UPDATE mailouts SET status = 'sent' WHERE id = ?", (row["id"],))
                    log.info("Retry sent to %s (id=%d)", row["to_address"], row["id"])
                except Exception as exc:
                    log.error("Retry failed for %s (id=%d): %s", row["to_address"], row["id"], exc)
        except Exception as exc:
            log.error("Retry loop error: %s", exc)


class InboxerHandler(CORSMixin, BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/health"):
            self._send(200, {"status": "ok"})
            return
        if self.path.startswith("/messages"):
            channel = self.path.split("?", 1)[1].split("=", 1)[1] if "?" in self.path else None
            with _connect() as conn:
                if channel:
                    rows = conn.execute("SELECT id, channel, sender, recipient, body, metadata FROM messages WHERE channel = ? ORDER BY id DESC", (channel,)).fetchall()
                else:
                    rows = conn.execute("SELECT id, channel, sender, recipient, body, metadata FROM messages ORDER BY id DESC").fetchall()
            payload = [{"id": row["id"], "channel": row["channel"], "sender": row["sender"], "recipient": row["recipient"], "body": row["body"], "metadata": json.loads(row["metadata"])} for row in rows]
            self._send(200, {"messages": payload})
            return
        if self.path.startswith("/settings"):
            self._send(200, {"settings": _load_settings()})
            return
        if self.path.startswith("/mail/history"):
            with _connect() as conn:
                rows = conn.execute("SELECT id, to_address, subject, status FROM mailouts ORDER BY id DESC LIMIT 50").fetchall()
            self._send(200, {"mailouts": [dict(row) for row in rows]})
            return
        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/messages":
            body = self._read_json()
            with _connect() as conn:
                conn.execute(
                    "INSERT INTO messages (channel, sender, recipient, body, metadata) VALUES (?, ?, ?, ?, ?)",
                    (
                        body["channel"],
                        body.get("sender", "system"),
                        body.get("recipient", "staff"),
                        body["body"],
                        json.dumps(body.get("metadata", {})),
                    ),
                )
            self._send(201, {"status": "stored"})
            return
        if self.path == "/mail":
            body = self._read_json()
            status = _send_smtp_mail(body)
            with _connect() as conn:
                conn.execute(
                    "INSERT INTO mailouts (to_address, subject, body, status, provider) VALUES (?, ?, ?, ?, ?)",
                    (body["to_address"], body.get("subject", "Inboxer mail"), body.get("body", ""), status, "smtp"),
                )
            self._send(201, {"status": status})
            return
        if self.path == "/settings":
            body = self._read_json()
            current = _load_settings()
            current.update(body)
            _save_settings(current)
            self._send(200, {"status": "saved", "settings": current})
            return
        self._send(404, {"error": "not_found"})

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def _send(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    retry_thread = threading.Thread(target=_retry_queued_emails, daemon=True)
    retry_thread.start()
    log.info("Inboxer starting with retry worker")
    server = ThreadingHTTPServer(("0.0.0.0", int(os.getenv("INBOXER_PORT", "8300"))), InboxerHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
