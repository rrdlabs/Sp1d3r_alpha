from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from .crypto import Ed25519Identity, sha256_bytes
from .pii_guard import contains_plaintext_pii
from .transaction import APP_SIG_VERIFY, NODE_AUTH, PAYLOAD_COMMIT, TransactionHeader, TRANSACTION_SIZE

GENESIS_PREV_HASH = b"\x00" * 32


@dataclass(frozen=True)
class ChainConfig:
    chain_id: str = "d31337m3-mainnet-1"
    block_time_ms: int = 2000
    validator_pubkeys: tuple[bytes, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ChainEvent:
    level: str
    code: str
    message: str
    sender_pubkey: bytes


class AppChain:
    def __init__(self, config: ChainConfig, state_path: str | Path | None = None) -> None:
        self.config = config
        self.state_path = Path(state_path) if state_path else None
        self.authenticated_nodes: set[bytes] = set(config.validator_pubkeys)
        self.approved_app_hashes: set[bytes] = set()
        self.payload_roots: list[bytes] = []
        self.events: list[ChainEvent] = []
        self.blocks: list[bytes] = []
        self.raw_transactions: list[bytes] = []
        self._on_commit: list[Callable[[int, bytes], None]] = []
        self._batch_mode: bool = False
        if self.state_path and self.state_path.exists():
            self._load()

    def on_commit(self, callback: Callable[[int, bytes], None]) -> None:
        self._on_commit.append(callback)

    @property
    def height(self) -> int:
        return len(self.blocks) - 1

    def blocks_since(self, height: int) -> list[bytes]:
        start = height + 1
        if start >= len(self.raw_transactions):
            return []
        return list(self.raw_transactions[start:])

    def get_block_hash(self, height: int) -> bytes | None:
        if 0 <= height < len(self.blocks):
            return self.blocks[height]
        return None

    def export_snapshot(self) -> dict[str, Any]:
        return {
            "chain_id": self.config.chain_id,
            "genesis_prev_hash": GENESIS_PREV_HASH.hex(),
            "height": self.height,
            "blocks_count": len(self.blocks),
            "authenticated_nodes": [k.hex() for k in self.authenticated_nodes],
            "approved_app_hashes": [h.hex() for h in self.approved_app_hashes],
            "payload_roots": [r.hex() for r in self.payload_roots],
        }

    def import_blocks(self, packed_transactions: list[bytes]) -> int:
        if not packed_transactions:
            return 0
        prev_hash = self.blocks[-1] if self.blocks else GENESIS_PREV_HASH
        for i, packed in enumerate(packed_transactions):
            if len(packed) != TRANSACTION_SIZE:
                raise ValueError(f"import_blocks: block {i} has wrong size ({len(packed)} != {TRANSACTION_SIZE})")
            tx = TransactionHeader.unpack(packed)
            if not tx.signature_is_valid():
                raise ValueError(f"import_blocks: invalid signature at block {i}")
            block_hash = sha256_bytes(prev_hash + packed)
            prev_hash = block_hash
        self._batch_mode = True
        try:
            for packed in packed_transactions:
                tx = TransactionHeader.unpack(packed)
                event = self.submit(tx)
                if event.level == "critical":
                    raise ValueError(f"import_blocks: critical error replaying block: {event.message}")
            self.save()
        finally:
            self._batch_mode = False
        return len(packed_transactions)

    def save(self) -> None:
        if not self.state_path or self._batch_mode:
            return
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        data: dict[str, Any] = {
            "chain_id": self.config.chain_id,
            "block_time_ms": self.config.block_time_ms,
            "validator_pubkeys": [k.hex() for k in self.config.validator_pubkeys],
            "authenticated_nodes": [k.hex() for k in self.authenticated_nodes],
            "approved_app_hashes": [h.hex() for h in self.approved_app_hashes],
            "payload_roots": [r.hex() for r in self.payload_roots],
            "blocks": [b.hex() for b in self.blocks],
            "raw_transactions": [t.hex() for t in self.raw_transactions],
            "events": [
                {
                    "level": e.level,
                    "code": e.code,
                    "message": e.message,
                    "sender_pubkey": e.sender_pubkey.hex(),
                }
                for e in self.events
            ],
        }
        tmp = self.state_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
        tmp.replace(self.state_path)

    def _load(self) -> None:
        data = json.loads(self.state_path.read_text(encoding="utf-8"))
        self.authenticated_nodes = {bytes.fromhex(k) for k in data.get("authenticated_nodes", [])}
        self.approved_app_hashes = {bytes.fromhex(h) for h in data.get("approved_app_hashes", [])}
        self.payload_roots = [bytes.fromhex(r) for r in data.get("payload_roots", [])]
        self.blocks = [bytes.fromhex(b) for b in data.get("blocks", [])]
        self.raw_transactions = [bytes.fromhex(t) for t in data.get("raw_transactions", [])]
        for e in data.get("events", []):
            self.events.append(
                ChainEvent(
                    level=e["level"],
                    code=e["code"],
                    message=e["message"],
                    sender_pubkey=bytes.fromhex(e["sender_pubkey"]),
                )
            )

    def approve_app_hash(self, binary_hash: bytes) -> None:
        if len(binary_hash) != 32:
            raise ValueError("binary hash must be 32 bytes")
        self.approved_app_hashes.add(binary_hash)

    def alert_pii_detected(self, url: str, pii_type: str, payload_hash: bytes) -> ChainEvent:
        event = self._event(
            "warning",
            "pii_detected",
            f"PII ({pii_type}) detected at {url}",
            TransactionHeader.create(
                0x00,
                Ed25519Identity.generate(),
                payload_hash or b"\x00" * 32,
            ),
        )
        self.save()
        return event

    def submit(self, transaction: TransactionHeader) -> ChainEvent:
        packed = transaction.pack()
        if contains_plaintext_pii(packed):
            self.authenticated_nodes.discard(transaction.sender_pubkey)
            if not self._batch_mode:
                self.save()
            return self._event("critical", "pii_leak_rejected", "transaction rejected", transaction)
        if not transaction.signature_is_valid():
            return self._event("error", "bad_signature", "transaction signature is invalid", transaction)
        if transaction.transaction_type == NODE_AUTH:
            return self._commit_node_auth(transaction)
        if transaction.sender_pubkey not in self.authenticated_nodes:
            return self._event("error", "sender_not_authenticated", "sender is not whitelisted", transaction)
        if transaction.transaction_type == APP_SIG_VERIFY:
            return self._commit_app_sig_verify(transaction)
        if transaction.transaction_type == PAYLOAD_COMMIT:
            return self._commit_payload(transaction)
        return self._event("error", "unknown_transaction_type", "transaction type is unsupported", transaction)

    def _commit_node_auth(self, transaction: TransactionHeader) -> ChainEvent:
        if self.config.validator_pubkeys and transaction.sender_pubkey not in self.config.validator_pubkeys:
            return self._event("error", "validator_rejected", "node auth requires validator key", transaction)
        self.authenticated_nodes.add(transaction.sender_pubkey)
        self._append_block(transaction)
        if not self._batch_mode:
            self.save()
        return self._event("info", "node_authenticated", "node key added to whitelist", transaction)

    def _commit_app_sig_verify(self, transaction: TransactionHeader) -> ChainEvent:
        if transaction.payload_hash not in self.approved_app_hashes:
            self.authenticated_nodes.discard(transaction.sender_pubkey)
            if not self._batch_mode:
                self.save()
            return self._event("critical", "quarantine", "binary hash is not approved", transaction)
        self._append_block(transaction)
        if not self._batch_mode:
            self.save()
        return self._event("info", "app_signature_verified", "binary hash is approved", transaction)

    def _commit_payload(self, transaction: TransactionHeader) -> ChainEvent:
        self.payload_roots.append(transaction.merkle_root)
        self._append_block(transaction)
        if not self._batch_mode:
            self.save()
        return self._event("info", "payload_committed", "payload root committed", transaction)

    def _append_block(self, transaction: TransactionHeader) -> None:
        previous = self.blocks[-1] if self.blocks else GENESIS_PREV_HASH
        packed = transaction.pack()
        block_hash = sha256_bytes(previous + packed)
        self.blocks.append(block_hash)
        self.raw_transactions.append(packed)
        height = len(self.blocks) - 1
        for cb in self._on_commit:
            cb(height, packed)

    def _event(
        self,
        level: str,
        code: str,
        message: str,
        transaction: TransactionHeader,
    ) -> ChainEvent:
        event = ChainEvent(level, code, message, transaction.sender_pubkey)
        self.events.append(event)
        return event
