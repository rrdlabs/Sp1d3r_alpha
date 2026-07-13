"""Ed25519 crypto operations matching the d31337m3 chain's identity scheme."""

import hashlib

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from mnemonic import Mnemonic

_SALT = b"d31337m3-seed-v1"
_PBKDF2_ITERATIONS = 200_000


def generate_keypair() -> tuple[bytes, bytes]:
    """Generate an Ed25519 keypair.

    Returns (private_key_raw_bytes, public_key_raw_bytes), each 32 bytes.
    """
    private_key = Ed25519PrivateKey.generate()
    return (
        private_key.private_bytes_raw(),
        private_key.public_key().public_bytes_raw(),
    )


def generate_mnemonic() -> str:
    """Generate a 12-word BIP-39 mnemonic phrase."""
    mnemo = Mnemonic("english")
    return mnemo.generate(strength=128)


def mnemonic_to_keypair(mnemonic_phrase: str) -> tuple[bytes, bytes]:
    """Deterministically derive an Ed25519 keypair from a mnemonic phrase.

    Returns (private_key_raw_bytes, public_key_raw_bytes), each 32 bytes.
    Same mnemonic always produces the same keypair.
    """
    seed = hashlib.pbkdf2_hmac(
        "sha256",
        mnemonic_phrase.strip().lower().encode("utf-8"),
        _SALT,
        _PBKDF2_ITERATIONS,
        dklen=32,
    )
    private_key = Ed25519PrivateKey.from_private_bytes(seed)
    return (
        private_key.private_bytes_raw(),
        private_key.public_key().public_bytes_raw(),
    )


def hash_mnemonic(mnemonic_phrase: str) -> str:
    """Return a SHA-256 hex digest of the mnemonic for storage/verification."""
    return hashlib.sha256(mnemonic_phrase.strip().lower().encode("utf-8")).hexdigest()


def verify_mnemonic(mnemonic_phrase: str, stored_hash: str) -> bool:
    """Verify a mnemonic phrase against a stored hash."""
    return hash_mnemonic(mnemonic_phrase) == stored_hash


def sign_challenge(private_key_raw: bytes, challenge: bytes) -> bytes:
    """Sign a challenge with an Ed25519 private key."""
    private_key = Ed25519PrivateKey.from_private_bytes(private_key_raw)
    return private_key.sign(challenge)


def verify_signature(public_key_raw: bytes, challenge: bytes, signature: bytes) -> bool:
    """Verify an Ed25519 signature against a public key."""
    try:
        public_key = Ed25519PublicKey.from_public_bytes(public_key_raw)
        public_key.verify(signature, challenge)
        return True
    except Exception:
        return False


def public_key_to_hex(public_key_raw: bytes) -> str:
    return public_key_raw.hex()


def public_key_from_hex(hex_str: str) -> bytes:
    return bytes.fromhex(hex_str)
