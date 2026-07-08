from __future__ import annotations

import struct
import time
from dataclasses import dataclass

from .crypto import Ed25519Identity, verify_ed25519

NODE_AUTH = 0x01
APP_SIG_VERIFY = 0x02
PAYLOAD_COMMIT = 0x03

TRANSACTION_FORMAT = ">I32sQ32s32s64s"
TRANSACTION_SIZE = struct.calcsize(TRANSACTION_FORMAT)
SIGNING_FORMAT = ">I32sQ32s32s"


@dataclass(frozen=True)
class TransactionHeader:
    transaction_type: int
    sender_pubkey: bytes
    block_timestamp: int
    payload_hash: bytes
    merkle_root: bytes
    digital_signature: bytes

    @classmethod
    def create(
        cls,
        transaction_type: int,
        identity: Ed25519Identity,
        payload_hash: bytes,
        merkle_root: bytes | None = None,
        block_timestamp: int | None = None,
    ) -> "TransactionHeader":
        timestamp = int(time.time()) if block_timestamp is None else block_timestamp
        root = b"\x00" * 32 if merkle_root is None else merkle_root
        unsigned = pack_unsigned(
            transaction_type,
            identity.public_key,
            timestamp,
            payload_hash,
            root,
        )
        return cls(
            transaction_type=transaction_type,
            sender_pubkey=identity.public_key,
            block_timestamp=timestamp,
            payload_hash=payload_hash,
            merkle_root=root,
            digital_signature=identity.sign(unsigned),
        )

    @classmethod
    def unpack(cls, raw: bytes) -> "TransactionHeader":
        if len(raw) != TRANSACTION_SIZE:
            raise ValueError(f"transaction must be {TRANSACTION_SIZE} bytes")
        fields = struct.unpack(TRANSACTION_FORMAT, raw)
        return cls(*fields)

    def pack_unsigned(self) -> bytes:
        return pack_unsigned(
            self.transaction_type,
            self.sender_pubkey,
            self.block_timestamp,
            self.payload_hash,
            self.merkle_root,
        )

    def pack(self) -> bytes:
        self._validate_lengths()
        return struct.pack(
            TRANSACTION_FORMAT,
            self.transaction_type,
            self.sender_pubkey,
            self.block_timestamp,
            self.payload_hash,
            self.merkle_root,
            self.digital_signature,
        )

    def signature_is_valid(self) -> bool:
        return verify_ed25519(
            self.sender_pubkey,
            self.digital_signature,
            self.pack_unsigned(),
        )

    def _validate_lengths(self) -> None:
        if len(self.sender_pubkey) != 32:
            raise ValueError("sender_pubkey must be 32 bytes")
        if len(self.payload_hash) != 32:
            raise ValueError("payload_hash must be 32 bytes")
        if len(self.merkle_root) != 32:
            raise ValueError("merkle_root must be 32 bytes")
        if len(self.digital_signature) != 64:
            raise ValueError("digital_signature must be 64 bytes")


def pack_unsigned(
    transaction_type: int,
    sender_pubkey: bytes,
    block_timestamp: int,
    payload_hash: bytes,
    merkle_root: bytes,
) -> bytes:
    if len(sender_pubkey) != 32:
        raise ValueError("sender_pubkey must be 32 bytes")
    if len(payload_hash) != 32:
        raise ValueError("payload_hash must be 32 bytes")
    if len(merkle_root) != 32:
        raise ValueError("merkle_root must be 32 bytes")
    return struct.pack(
        SIGNING_FORMAT,
        transaction_type,
        sender_pubkey,
        block_timestamp,
        payload_hash,
        merkle_root,
    )
