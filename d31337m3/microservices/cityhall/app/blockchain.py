"""Ed25519 crypto operations matching the d31337m3 chain's identity scheme."""

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)


def generate_keypair() -> tuple[bytes, bytes]:
    """Generate an Ed25519 keypair.

    Returns (private_key_raw_bytes, public_key_raw_bytes), each 32 bytes.
    """
    private_key = Ed25519PrivateKey.generate()
    return (
        private_key.private_bytes_raw(),
        private_key.public_key().public_bytes_raw(),
    )


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
