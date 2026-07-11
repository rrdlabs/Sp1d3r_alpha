import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import stripe
import requests

DB_PATH = "/data/banker.sqlite3"
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://d31337m3.com")
CITYHALL_URL = os.environ.get("CITYHALL_URL", "http://cityhall:8000")
INBOXER_URL = os.environ.get("INBOXER_URL", "http://inboxer:8300")

WALLET_ADDRESS = "0x4Ffd3170C4b650b2D7681e402b49e6C341274299"

RPC_URLS = {
    "polygon": "https://polygon-rpc.com",
    "base": "https://mainnet.base.org",
}

USDC_CONTRACTS = {
    "polygon": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
}

USDT_CONTRACTS = {
    "polygon": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    "base": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
}

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS subscription_tiers (
            id TEXT PRIMARY KEY,
            name TEXT,
            price_cents INTEGER,
            currency TEXT DEFAULT 'usd',
            interval TEXT DEFAULT 'monthly',
            features TEXT DEFAULT '{}',
            stripe_price_id TEXT,
            is_active BOOLEAN DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            tier_id TEXT,
            status TEXT DEFAULT 'active',
            payment_method TEXT,
            stripe_subscription_id TEXT,
            stripe_customer_id TEXT,
            interac_confirmation TEXT,
            crypto_tx_hash TEXT,
            crypto_network TEXT,
            failed_attempts INTEGER DEFAULT 0,
            current_period_start TIMESTAMP,
            current_period_end TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payment_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscription_id TEXT,
            user_id TEXT NOT NULL,
            amount_cents INTEGER,
            currency TEXT,
            payment_method TEXT,
            status TEXT,
            provider TEXT,
            provider_txn_id TEXT,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ip_blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT NOT NULL UNIQUE,
            reason TEXT,
            added_by TEXT,
            shared_with_nodes BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()
    print("[banker] Database initialized")


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    return [dict(r) for r in rows]


def compute_period_end(tier):
    interval = tier.get("interval", "monthly")
    now = datetime.utcnow()
    if interval == "monthly":
        return now + timedelta(days=30)
    elif interval == "yearly":
        return now + timedelta(days=365)
    elif interval == "weekly":
        return now + timedelta(weeks=1)
    return now + timedelta(days=30)


def _rpc_call(network, method, params):
    rpc_url = RPC_URLS.get(network, RPC_URLS["polygon"])
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    try:
        resp = requests.post(rpc_url, json=payload, timeout=10)
        data = resp.json()
        if "result" in data:
            return data["result"]
        if "error" in data:
            print(f"[banker] RPC error: {data['error']}")
        return None
    except Exception as e:
        print(f"[banker] RPC call failed: {e}")
        return None


def verify_crypto_tx(tx_hash, network, expected_recipient, amount_cents):
    if not tx_hash or not tx_hash.startswith("0x") or len(tx_hash) != 66:
        return False, "Invalid transaction hash format"

    tx_data = _rpc_call(network, "eth_getTransactionByHash", [tx_hash])
    if not tx_data:
        return False, "Transaction not found on chain"

    to_addr = (tx_data.get("to") or "").lower()
    if to_addr != expected_recipient.lower():
        return False, f"Recipient mismatch: expected {expected_recipient}, got {tx_data.get('to')}"

    if tx_data.get("blockNumber") is None:
        return False, "Transaction not yet confirmed (pending)"

    receipt = _rpc_call(network, "eth_getTransactionReceipt", [tx_hash])
    if not receipt:
        return False, "Transaction receipt not found"
    if receipt.get("status") != "0x1":
        return False, "Transaction reverted on chain"

    logs = receipt.get("logs", [])
    expected_amount = amount_cents * 10000

    for log_entry in logs:
        topic0 = log_entry.get("topics", [None])[0] if log_entry.get("topics") else None
        if topic0 and topic0.lower() == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef":
            contract = log_entry.get("address", "").lower()
            if contract in [c.lower() for c in list(USDC_CONTRACTS.values()) + list(USDT_CONTRACTS.values())]:
                data = log_entry.get("data", "0x")
                if data.startswith("0x"):
                    data = data[2:]
                if len(data) >= 64:
                    transfer_amount = int(data[:64], 16)
                    if transfer_amount >= expected_amount:
                        return True, "Payment verified"
                    else:
                        return False, f"Insufficient amount: sent {transfer_amount / 10000:.2f}, expected {amount_cents / 100:.2f}"

    return False, "No matching ERC20 transfer event found in transaction"


def handle_payment_failure(subscription, provider, error_message):
    conn = get_db()
    try:
        failed = subscription["failed_attempts"] + 1
        conn.execute(
            "UPDATE subscriptions SET failed_attempts = ? WHERE id = ?",
            (failed, subscription["id"]),
        )

        conn.execute(
            """INSERT INTO payment_records
               (subscription_id, user_id, amount_cents, currency, payment_method, status, provider, error_message)
               VALUES (?, ?, 0, ?, ?, 'failed', ?, ?)""",
            (
                subscription["id"],
                subscription["user_id"],
                "usd",
                provider,
                provider,
                error_message,
            ),
        )
        conn.commit()

        if failed >= 3:
            conn.execute(
                "UPDATE subscriptions SET status = 'suspended' WHERE id = ?",
                (subscription["id"],),
            )
            conn.commit()
            print(f"[banker] Subscription {subscription['id']} suspended after {failed} failed attempts")

            try:
                requests.post(
                    f"{CITYHALL_URL}/admin/users/{subscription['user_id']}/suspend",
                    timeout=5,
                )
                print(f"[banker] User {subscription['user_id']} suspended via cityhall")
            except Exception as e:
                print(f"[banker] Failed to call cityhall: {e}")

            try:
                requests.post(
                    f"{INBOXER_URL}/messages",
                    json={
                        "user_id": subscription["user_id"],
                        "subject": "Payment Issue - Account Suspended",
                        "body": "Your account has been suspended due to 3 failed payment attempts. Please update your payment method or contact support.",
                    },
                    timeout=5,
                )
            except Exception as e:
                print(f"[banker] Failed to call inboxer: {e}")

        return failed
    finally:
        conn.close()


def handle_payment_success(subscription_id):
    conn = get_db()
    try:
        sub = conn.execute("SELECT * FROM subscriptions WHERE id = ?", (subscription_id,)).fetchone()
        if not sub:
            return None
        sub = dict(sub)

        tier = conn.execute("SELECT * FROM subscription_tiers WHERE id = ?", (sub["tier_id"],)).fetchone()
        if not tier:
            return None
        tier = dict(tier)

        now = datetime.utcnow().isoformat()
        end = compute_period_end(tier)

        conn.execute(
            """UPDATE subscriptions
               SET status = 'active', failed_attempts = 0,
                   current_period_start = ?, current_period_end = ?
               WHERE id = ?""",
            (now, end.isoformat(), subscription_id),
        )

        conn.execute(
            """INSERT INTO payment_records
               (subscription_id, user_id, amount_cents, currency, payment_method, status, provider)
               VALUES (?, ?, ?, ?, ?, 'succeeded', ?)""",
            (
                subscription_id,
                sub["user_id"],
                tier["price_cents"],
                tier.get("currency", "usd"),
                sub["payment_method"],
                sub["payment_method"],
            ),
        )
        conn.commit()

        sub = conn.execute("SELECT * FROM subscriptions WHERE id = ?", (subscription_id,)).fetchone()
        return dict(sub) if sub else None
    finally:
        conn.close()


class CORSMixin:
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()


class BankerHandler(CORSMixin, BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[banker] {args[0]}")

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw)

    def _send_json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = parse_qs(parsed.query)

        if path == "/health":
            self._send_json(200, {"status": "ok", "service": "banker"})

        elif path == "/tiers":
            conn = get_db()
            rows = conn.execute("SELECT * FROM subscription_tiers ORDER BY sort_order").fetchall()
            conn.close()
            tiers = rows_to_list(rows)
            for t in tiers:
                if t.get("features"):
                    try:
                        t["features"] = json.loads(t["features"])
                    except (json.JSONDecodeError, TypeError):
                        pass
            self._send_json(200, {"tiers": tiers})

        elif path == "/subscriptions":
            user_id = params.get("user_id", [None])[0]
            conn = get_db()
            if user_id:
                rows = conn.execute("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM subscriptions ORDER BY created_at DESC").fetchall()
            conn.close()
            self._send_json(200, {"subscriptions": rows_to_list(rows)})

        elif path.startswith("/subscriptions/") and path.endswith("/payments"):
            sub_id = path.split("/")[2]
            conn = get_db()
            rows = conn.execute("SELECT * FROM payment_records WHERE subscription_id = ? ORDER BY created_at DESC", (sub_id,)).fetchall()
            conn.close()
            self._send_json(200, {"payments": rows_to_list(rows)})

        elif path == "/blacklist":
            conn = get_db()
            rows = conn.execute("SELECT * FROM ip_blacklist ORDER BY created_at DESC").fetchall()
            conn.close()
            self._send_json(200, {"blacklist": rows_to_list(rows)})

        elif path == "/node-check":
            user_id = params.get("user_id", [None])[0]
            if not user_id:
                self._send_json(400, {"error": "user_id required"})
                return
            try:
                resp = requests.get(f"{CITYHALL_URL}/internal/node-check", params={"user_id": user_id}, timeout=5)
                data = resp.json()
                self._send_json(200, data)
            except Exception as e:
                self._send_json(502, {"error": f"cityhall_unreachable: {str(e)}"})

        elif path == "/subscription-status":
            user_id = params.get("user_id", [None])[0]
            if not user_id:
                self._send_json(400, {"error": "user_id required"})
                return
            is_nodeop = False
            try:
                resp = requests.get(f"{CITYHALL_URL}/internal/node-check", params={"user_id": user_id}, timeout=5)
                is_nodeop = resp.json().get("is_nodeop", False)
            except Exception:
                pass
            conn = get_db()
            active_sub = conn.execute(
                "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
                (user_id,),
            ).fetchone()
            pending_sub = conn.execute(
                "SELECT * FROM subscriptions WHERE user_id = ? AND status LIKE 'pending%' ORDER BY created_at DESC LIMIT 1",
                (user_id,),
            ).fetchone()
            conn.close()
            self._send_json(200, {
                "is_nodeop": is_nodeop,
                "has_active_sub": active_sub is not None,
                "active_subscription": row_to_dict(active_sub) if active_sub else None,
                "pending_subscription": row_to_dict(pending_sub) if pending_sub else None,
            })

        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/tiers":
            body = self._read_body()
            tier_id = body.get("id", str(uuid.uuid4())[:8])
            features = body.get("features", {})
            if isinstance(features, (dict, list)):
                features = json.dumps(features)

            conn = get_db()
            existing = conn.execute("SELECT id FROM subscription_tiers WHERE id = ?", (tier_id,)).fetchone()
            if existing:
                conn.execute(
                    """UPDATE subscription_tiers
                       SET name=?, price_cents=?, currency=?, interval=?, features=?,
                           stripe_price_id=?, is_active=?, sort_order=?
                       WHERE id=?""",
                    (
                        body.get("name", ""),
                        body.get("price_cents", 0),
                        body.get("currency", "usd"),
                        body.get("interval", "monthly"),
                        features,
                        body.get("stripe_price_id", ""),
                        body.get("is_active", 1),
                        body.get("sort_order", 0),
                        tier_id,
                    ),
                )
            else:
                conn.execute(
                    """INSERT INTO subscription_tiers (id, name, price_cents, currency, interval, features, stripe_price_id, is_active, sort_order)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        tier_id,
                        body.get("name", ""),
                        body.get("price_cents", 0),
                        body.get("currency", "usd"),
                        body.get("interval", "monthly"),
                        features,
                        body.get("stripe_price_id", ""),
                        body.get("is_active", 1),
                        body.get("sort_order", 0),
                    ),
                )
            conn.commit()
            tier = conn.execute("SELECT * FROM subscription_tiers WHERE id = ?", (tier_id,)).fetchone()
            conn.close()
            self._send_json(200, {"tier": row_to_dict(tier)})

        elif path == "/subscriptions/create":
            body = self._read_body()
            user_id = body.get("user_id")
            tier_id = body.get("tier_id")
            payment_method = body.get("payment_method", "stripe")

            if not user_id or not tier_id:
                self._send_json(400, {"error": "user_id and tier_id required"})
                return

            is_nodeop = False
            try:
                resp = requests.get(f"{CITYHALL_URL}/internal/node-check", params={"user_id": user_id}, timeout=5)
                is_nodeop = resp.json().get("is_nodeop", False)
                if is_nodeop:
                    print(f"[banker] User {user_id} is a node operator — free pro tier")
            except Exception as e:
                print(f"[banker] node-check failed: {e}")

            conn = get_db()
            tier = conn.execute("SELECT * FROM subscription_tiers WHERE id = ?", (tier_id,)).fetchone()
            if not tier:
                conn.close()
                self._send_json(404, {"error": "tier not found"})
                return
            tier = dict(tier)

            sub_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()

            if is_nodeop:
                end = compute_period_end(tier)
                conn.execute(
                    """INSERT INTO subscriptions (id, user_id, tier_id, status, payment_method, current_period_start, current_period_end, created_at)
                       VALUES (?, ?, ?, 'active', 'nodeop_free', ?, ?, ?)""",
                    (sub_id, user_id, tier_id, now, now, end.isoformat(), now),
                )
                conn.execute(
                    """INSERT INTO payment_records
                       (subscription_id, user_id, amount_cents, currency, payment_method, status, provider)
                       VALUES (?, ?, ?, ?, 'nodeop_free', 'succeeded', 'nodeop_free')""",
                    (sub_id, user_id, 0, tier.get("currency", "usd")),
                )
                conn.commit()
                conn.close()
                self._send_json(200, {
                    "subscription": {"id": sub_id, "status": "active"},
                    "subscription_id": sub_id,
                    "nodeop_free": True,
                    "message": "Free Pro subscription activated for node operator",
                })
                return

            conn.execute(
                """INSERT INTO subscriptions (id, user_id, tier_id, status, payment_method, created_at)
                   VALUES (?, ?, ?, 'pending_payment', ?, ?)""",
                (sub_id, user_id, tier_id, payment_method, now),
            )
            conn.commit()

            if payment_method == "stripe":
                try:
                    checkout_session = stripe.checkout.Session.create(
                        mode="subscription",
                        line_items=[{"price": tier["stripe_price_id"], "quantity": 1}],
                        success_url=f"{FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
                        cancel_url=f"{FRONTEND_URL}/payment/cancel",
                        client_reference_id=sub_id,
                        metadata={"subscription_id": sub_id, "user_id": user_id},
                    )
                    conn.execute(
                        "UPDATE subscriptions SET stripe_subscription_id = ? WHERE id = ?",
                        (checkout_session.id, sub_id),
                    )
                    conn.commit()
                    conn.close()
                    self._send_json(200, {
                        "subscription": {"id": sub_id, "status": "pending_payment"},
                        "checkout_url": checkout_session.url,
                        "subscription_id": sub_id,
                    })
                except Exception as e:
                    conn.close()
                    self._send_json(500, {"error": f"Stripe error: {str(e)}"})

            elif payment_method == "interac":
                conn.execute(
                    "UPDATE subscriptions SET status = 'pending_interac' WHERE id = ?",
                    (sub_id,),
                )
                conn.commit()
                conn.close()
                self._send_json(200, {
                    "subscription": {"id": sub_id, "status": "pending_interac"},
                    "subscription_id": sub_id,
                    "interac_email": "payments@d31337m3.com",
                    "interac_message": f"Use subscription ID {sub_id} as the e-transfer message",
                    "amount_cents": tier["price_cents"],
                    "currency": tier.get("currency", "usd"),
                })

            elif payment_method == "crypto":
                conn.execute(
                    "UPDATE subscriptions SET status = 'pending_crypto' WHERE id = ?",
                    (sub_id,),
                )
                conn.commit()
                conn.close()
                self._send_json(200, {
                    "subscription": {"id": sub_id, "status": "pending_crypto"},
                    "subscription_id": sub_id,
                    "wallet_address": WALLET_ADDRESS,
                    "networks": ["polygon", "base"],
                    "token": "ERC20 USDC/USDT",
                    "amount_cents": tier["price_cents"],
                    "currency": tier.get("currency", "usd"),
                })

            else:
                conn.close()
                self._send_json(400, {"error": f"Unknown payment method: {payment_method}"})

        elif path == "/payments/verify":
            body = self._read_body()
            sub_id = body.get("subscription_id")
            provider = body.get("provider", "stripe")

            if not sub_id:
                self._send_json(400, {"error": "subscription_id required"})
                return

            conn = get_db()
            sub = conn.execute("SELECT * FROM subscriptions WHERE id = ?", (sub_id,)).fetchone()
            if not sub:
                conn.close()
                self._send_json(404, {"error": "subscription not found"})
                return
            sub = dict(sub)
            conn.close()

            if provider == "stripe":
                session_id = body.get("session_id") or body.get("checkout_session_id")
                if not session_id and sub.get("stripe_subscription_id"):
                    session_id = sub["stripe_subscription_id"]
                if not session_id:
                    self._send_json(400, {"error": "session_id required for stripe verification"})
                    return
                try:
                    session = stripe.checkout.Session.retrieve(session_id)
                    if session.payment_status == "paid":
                        result = handle_payment_success(sub_id)
                        if result:
                            self._send_json(200, {"status": "verified", "subscription": result})
                        else:
                            self._send_json(500, {"error": "Failed to update subscription"})
                    else:
                        failed = handle_payment_failure(sub, "stripe", "Payment not completed")
                        resp = {"status": "failed", "failed_attempts": failed}
                        if failed >= 3:
                            resp["suspended"] = True
                        self._send_json(200, resp)
                except Exception as e:
                    failed = handle_payment_failure(sub, "stripe", str(e))
                    resp = {"status": "failed", "failed_attempts": failed, "error": str(e)}
                    if failed >= 3:
                        resp["suspended"] = True
                    self._send_json(200, resp)

            elif provider == "interac":
                confirmation = body.get("confirmation", "")
                conn = get_db()
                conn.execute(
                    "UPDATE subscriptions SET interac_confirmation = ? WHERE id = ?",
                    (confirmation, sub_id),
                )
                conn.commit()
                conn.close()
                result = handle_payment_success(sub_id)
                if result:
                    self._send_json(200, {"status": "verified", "subscription": result})
                else:
                    self._send_json(500, {"error": "Failed to update subscription"})

            elif provider == "crypto":
                tx_hash = body.get("tx_hash", "")
                network = body.get("network", "polygon")
                if not tx_hash:
                    self._send_json(400, {"error": "tx_hash required for crypto verification"})
                    return

                conn = get_db()
                tier = conn.execute("SELECT * FROM subscription_tiers WHERE id = ?", (sub["tier_id"],)).fetchone()
                tier = dict(tier) if tier else {}
                amount_cents = tier.get("price_cents", 0)

                verified, message = verify_crypto_tx(tx_hash, network, WALLET_ADDRESS, amount_cents)
                print(f"[banker] Crypto verify: {tx_hash[:16]}... on {network} -> {message}")

                conn.execute(
                    "UPDATE subscriptions SET crypto_tx_hash = ?, crypto_network = ? WHERE id = ?",
                    (tx_hash, network, sub_id),
                )
                conn.commit()

                if verified:
                    conn.close()
                    result = handle_payment_success(sub_id)
                    if result:
                        self._send_json(200, {"status": "verified", "subscription": result, "message": message})
                    else:
                        self._send_json(500, {"error": "Failed to update subscription"})
                else:
                    failed = handle_payment_failure(sub, "crypto", message)
                    conn.close()
                    resp = {"status": "failed", "failed_attempts": failed, "message": message}
                    if failed >= 3:
                        resp["suspended"] = True
                    self._send_json(200, resp)

            else:
                self._send_json(400, {"error": f"Unknown provider: {provider}"})

        elif path == "/payments/webhook":
            payload = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            sig_header = self.headers.get("Stripe-Signature", "")

            if not STRIPE_WEBHOOK_SECRET:
                self._send_json(400, {"error": "Webhook secret not configured"})
                return

            try:
                event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
            except stripe.error.SignatureVerificationError:
                self._send_json(400, {"error": "Invalid signature"})
                return
            except Exception as e:
                self._send_json(400, {"error": str(e)})
                return

            event_type = event["type"]

            if event_type == "checkout.session.completed":
                session = event["data"]["object"]
                sub_id = session.get("client_reference_id") or (session.get("metadata") or {}).get("subscription_id")
                if sub_id:
                    result = handle_payment_success(sub_id)
                    if result:
                        print(f"[banker] Webhook: payment succeeded for {sub_id}")

            elif event_type == "invoice.payment_failed":
                invoice = event["data"]["object"]
                stripe_sub_id = invoice.get("subscription")
                if stripe_sub_id:
                    conn = get_db()
                    sub = conn.execute(
                        "SELECT * FROM subscriptions WHERE stripe_subscription_id = ?",
                        (stripe_sub_id,),
                    ).fetchone()
                    conn.close()
                    if sub:
                        handle_payment_failure(dict(sub), "stripe", "Webhook: payment failed")

            self._send_json(200, {"received": True})

        elif path.startswith("/subscriptions/") and path.endswith("/cancel"):
            sub_id = path.split("/")[2]
            conn = get_db()
            conn.execute("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?", (sub_id,))
            conn.commit()
            sub = conn.execute("SELECT * FROM subscriptions WHERE id = ?", (sub_id,)).fetchone()
            conn.close()
            if sub:
                self._send_json(200, {"status": "cancelled", "subscription": row_to_dict(sub)})
            else:
                self._send_json(404, {"error": "subscription not found"})

        elif path == "/blacklist":
            body = self._read_body()
            ip = body.get("ip_address")
            if not ip:
                self._send_json(400, {"error": "ip_address required"})
                return
            conn = get_db()
            try:
                conn.execute(
                    """INSERT INTO ip_blacklist (ip_address, reason, added_by, shared_with_nodes)
                       VALUES (?, ?, ?, ?)""",
                    (
                        ip,
                        body.get("reason", ""),
                        body.get("added_by", "system"),
                        body.get("shared_with_nodes", 1),
                    ),
                )
                conn.commit()
                self._send_json(200, {"status": "added", "ip_address": ip})
            except sqlite3.IntegrityError:
                self._send_json(200, {"status": "already_exists", "ip_address": ip})
            finally:
                conn.close()

        else:
            self._send_json(404, {"error": "not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path.startswith("/tiers/"):
            tier_id = path.split("/")[2]
            conn = get_db()
            conn.execute("DELETE FROM subscription_tiers WHERE id = ?", (tier_id,))
            conn.commit()
            conn.close()
            self._send_json(200, {"status": "deleted"})

        elif path.startswith("/blacklist/"):
            bl_id = path.split("/")[2]
            conn = get_db()
            conn.execute("DELETE FROM ip_blacklist WHERE id = ?", (bl_id,))
            conn.commit()
            conn.close()
            self._send_json(200, {"status": "removed"})

        else:
            self._send_json(404, {"error": "not found"})


def main():
    init_db()
    port = int(os.environ.get("BANKER_PORT", 8700))
    server = ThreadingHTTPServer(("0.0.0.0", port), BankerHandler)
    print(f"[banker] Listening on 0.0.0.0:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
