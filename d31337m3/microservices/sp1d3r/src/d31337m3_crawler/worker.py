from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any

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


class FindingStore:
    def __init__(self, store_dir: str | Path) -> None:
        self.store_dir = Path(store_dir)
        self.store_dir.mkdir(parents=True, exist_ok=True)

    def save(self, finding: EncryptedFinding, metadata: dict[str, Any] | None = None) -> Path:
        key = finding.payload_hash.hex()
        path = self.store_dir / f"{key}.json"
        data = {
            "payload_hash": key,
            "ephemeral_public_key": finding.ephemeral_public_key.hex(),
            "nonce": finding.nonce.hex(),
            "ciphertext": finding.ciphertext.hex(),
            "merkle_root": finding.merkle_root.hex(),
            "metadata": metadata or {},
        }
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
        tmp.replace(path)
        return path

    def load(self, payload_hash: bytes) -> EncryptedFinding | None:
        path = self.store_dir / f"{payload_hash.hex()}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return EncryptedFinding(
            ephemeral_public_key=bytes.fromhex(data["ephemeral_public_key"]),
            nonce=bytes.fromhex(data["nonce"]),
            ciphertext=bytes.fromhex(data["ciphertext"]),
            payload_hash=bytes.fromhex(data["payload_hash"]),
            merkle_root=bytes.fromhex(data["merkle_root"]),
        )

    def list_hashes(self) -> list[bytes]:
        return [bytes.fromhex(p.stem) for p in self.store_dir.glob("*.json")]
