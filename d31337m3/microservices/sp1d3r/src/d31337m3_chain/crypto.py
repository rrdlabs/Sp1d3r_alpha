from __future__ import annotations

import hashlib
from dataclasses import dataclass

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PrivateFormat,
    PublicFormat,
    NoEncryption,
)


def sha256_bytes(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


@dataclass(frozen=True)
class Ed25519Identity:
    private_key: Ed25519PrivateKey

    @classmethod
    def generate(cls) -> "Ed25519Identity":
        return cls(Ed25519PrivateKey.generate())

    @classmethod
    def from_private_bytes(cls, raw: bytes) -> "Ed25519Identity":
        if len(raw) != 32:
            raise ValueError("Ed25519 private key seed must be exactly 32 bytes")
        return cls(Ed25519PrivateKey.from_private_bytes(raw))

    @property
    def public_key(self) -> bytes:
        return self.private_key.public_key().public_bytes(
            encoding=Encoding.Raw,
            format=PublicFormat.Raw,
        )

    @property
    def private_seed(self) -> bytes:
        return self.private_key.private_bytes(
            encoding=Encoding.Raw,
            format=PrivateFormat.Raw,
            encryption_algorithm=NoEncryption(),
        )

    def sign(self, message: bytes) -> bytes:
        return self.private_key.sign(message)


def verify_ed25519(public_key: bytes, signature: bytes, message: bytes) -> bool:
    if len(public_key) != 32 or len(signature) != 64:
        return False
    try:
        Ed25519PublicKey.from_public_bytes(public_key).verify(signature, message)
        return True
    except Exception:
        return False
