from __future__ import annotations

from dataclasses import dataclass, field

from .crypto import sha256_bytes
from .pii_guard import contains_plaintext_pii
from .transaction import APP_SIG_VERIFY, NODE_AUTH, PAYLOAD_COMMIT, TransactionHeader


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
    def __init__(self, config: ChainConfig) -> None:
        self.config = config
        self.authenticated_nodes: set[bytes] = set(config.validator_pubkeys)
        self.approved_app_hashes: set[bytes] = set()
        self.payload_roots: list[bytes] = []
        self.events: list[ChainEvent] = []
        self.blocks: list[bytes] = []

    def approve_app_hash(self, binary_hash: bytes) -> None:
        if len(binary_hash) != 32:
            raise ValueError("binary hash must be 32 bytes")
        self.approved_app_hashes.add(binary_hash)

    def submit(self, transaction: TransactionHeader) -> ChainEvent:
        packed = transaction.pack()
        if contains_plaintext_pii(packed):
            self.authenticated_nodes.discard(transaction.sender_pubkey)
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
        return self._event("info", "node_authenticated", "node key added to whitelist", transaction)

    def _commit_app_sig_verify(self, transaction: TransactionHeader) -> ChainEvent:
        if transaction.payload_hash not in self.approved_app_hashes:
            self.authenticated_nodes.discard(transaction.sender_pubkey)
            return self._event("critical", "quarantine", "binary hash is not approved", transaction)
        self._append_block(transaction)
        return self._event("info", "app_signature_verified", "binary hash is approved", transaction)

    def _commit_payload(self, transaction: TransactionHeader) -> ChainEvent:
        self.payload_roots.append(transaction.merkle_root)
        self._append_block(transaction)
        return self._event("info", "payload_committed", "payload root committed", transaction)

    def _append_block(self, transaction: TransactionHeader) -> None:
        previous = self.blocks[-1] if self.blocks else b"\x00" * 32
        self.blocks.append(sha256_bytes(previous + transaction.pack()))

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
