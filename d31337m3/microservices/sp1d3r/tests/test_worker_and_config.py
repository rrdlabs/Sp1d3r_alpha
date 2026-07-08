import tempfile
import unittest
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives import serialization

from d31337m3_chain import NODE_AUTH, AppChain, ChainConfig, Ed25519Identity, TransactionHeader, sha256_bytes
from d31337m3_core import Config
from d31337m3_core.orchestrator import Orchestrator
from d31337m3_crawler import CrawlerWorker, WorkerConfig


class WorkerAndConfigTests(unittest.TestCase):
    def test_worker_encrypts_and_commits_hash_only(self):
        identity = Ed25519Identity.generate()
        chain = AppChain(ChainConfig(validator_pubkeys=(identity.public_key,)))
        chain.submit(TransactionHeader.create(NODE_AUTH, identity, sha256_bytes(b"auth")))
        recipient_private = x25519.X25519PrivateKey.generate()
        recipient_public = recipient_private.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        worker = CrawlerWorker(WorkerConfig(max_workers=2), chain, identity)
        findings = worker.process_payloads([b"redacted finding"], recipient_public)
        self.assertEqual(len(findings), 1)
        self.assertEqual(len(chain.payload_roots), 1)
        self.assertNotIn(b"redacted finding", findings[0].ciphertext)

    def test_worker_rejects_plaintext_pii(self):
        identity = Ed25519Identity.generate()
        chain = AppChain(ChainConfig(validator_pubkeys=(identity.public_key,)))
        recipient_private = x25519.X25519PrivateKey.generate()
        recipient_public = recipient_private.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        worker = CrawlerWorker(WorkerConfig(), chain, identity)
        with self.assertRaises(ValueError):
            worker.encrypt_payload(b"alice@example.com", recipient_public)

    def test_orchestrator_atomic_config_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "config.toml"
            Orchestrator(Config()).write_config(path)
            text = path.read_text(encoding="utf-8")
            self.assertIn('chain_id = "d31337m3-mainnet-1"', text)


if __name__ == "__main__":
    unittest.main()
