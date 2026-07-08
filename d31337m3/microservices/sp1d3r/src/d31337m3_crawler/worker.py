from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from d31337m3_chain import PAYLOAD_COMMIT, AppChain, Ed25519Identity, TransactionHeader, sha256_bytes
from d31337m3_chain.merkle import merkle_root
from d31337m3_chain.pii_guard import contains_plaintext_pii


@dataclass(frozen=True)
class WorkerConfig:
    max_workers: int = 4
    reject_plaintext_pii: bool = True


@dataclass(frozen=True)
class EncryptedFinding:
    ephemeral_public_key: bytes
    nonce: bytes
    ciphertext: bytes
    payload_hash: bytes
    merkle_root: bytes


class CrawlerWorker:
    def __init__(self, config: WorkerConfig, chain: AppChain, identity: Ed25519Identity) -> None:
        self.config = config
        self.chain = chain
        self.identity = identity

    def process_payloads(self, payloads: list[bytes], recipient_public_key: bytes) -> list[EncryptedFinding]:
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as pool:
            findings = list(pool.map(lambda payload: self.encrypt_payload(payload, recipient_public_key), payloads))
        for finding in findings:
            transaction = TransactionHeader.create(
                PAYLOAD_COMMIT,
                self.identity,
                finding.payload_hash,
                finding.merkle_root,
            )
            event = self.chain.submit(transaction)
            if event.code != "payload_committed":
                raise RuntimeError(f"payload commit failed: {event.code}")
        return findings

    def encrypt_payload(self, payload: bytes, recipient_public_key: bytes) -> EncryptedFinding:
        if self.config.reject_plaintext_pii and contains_plaintext_pii(payload):
            raise ValueError("payload appears to contain plaintext PII; encrypt at source or redact first")
        recipient = x25519.X25519PublicKey.from_public_bytes(recipient_public_key)
        ephemeral_private = x25519.X25519PrivateKey.generate()
        shared_secret = ephemeral_private.exchange(recipient)
        key = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=b"d31337m3-crawler-e2ee-v1",
        ).derive(shared_secret)
        nonce = os.urandom(12)
        ciphertext = AESGCM(key).encrypt(nonce, payload, None)
        payload_hash = sha256_bytes(ciphertext)
        return EncryptedFinding(
            ephemeral_public_key=ephemeral_private.public_key().public_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PublicFormat.Raw,
            ),
            nonce=nonce,
            ciphertext=ciphertext,
            payload_hash=payload_hash,
            merkle_root=merkle_root([payload_hash]),
        )
