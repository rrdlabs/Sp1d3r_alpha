import json
import tempfile
import time
import unittest
from pathlib import Path

from d31337m3_chain import (
    APP_SIG_VERIFY,
    GENESIS_PREV_HASH,
    NODE_AUTH,
    PAYLOAD_COMMIT,
    AppChain,
    ChainConfig,
    Ed25519Identity,
    GossipWorker,
    PeerInfo,
    PeerStore,
    TransactionHeader,
    fetch_json,
    sha256_bytes,
    sign_request,
    verify_signed_request,
)
from d31337m3_chain.transaction import TRANSACTION_SIZE


class P2PAuthTests(unittest.TestCase):
    def test_sign_and_verify_request(self):
        identity = Ed25519Identity.generate()
        method, path, body = "GET", "/v1/chain/ping", b""
        pubkey_hex, sig_hex = sign_request(identity, method, path, body)
        result = verify_signed_request(pubkey_hex, sig_hex, method, path, body)
        self.assertEqual(result, identity.public_key)

    def test_verify_bad_signature(self):
        identity = Ed25519Identity.generate()
        method, path, body = "GET", "/v1/chain/ping", b""
        pubkey_hex, sig_hex = sign_request(identity, method, path, body)
        result = verify_signed_request(pubkey_hex, sig_hex, method, path + "/", body)
        self.assertIsNone(result)

    def test_verify_empty_headers(self):
        result = verify_signed_request("", "", "GET", "/v1/chain/ping", b"")
        self.assertIsNone(result)

    def test_verify_bad_hex(self):
        result = verify_signed_request("bad", "also_bad", "GET", "/v1/chain/ping", b"")
        self.assertIsNone(result)


class PeerStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.path = self.tmp / "peers.json"
        self.store = PeerStore(self.path)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_add_and_list(self):
        k1 = Ed25519Identity.generate().public_key
        k2 = Ed25519Identity.generate().public_key
        self.store.add("http://node1:9000", k1, height=5)
        self.store.add("http://node2:9000", k2, height=10)
        peers = self.store.list()
        self.assertEqual(len(peers), 2)
        urls = {p.url for p in peers}
        self.assertIn("http://node1:9000", urls)
        self.assertIn("http://node2:9000", urls)

    def test_remove(self):
        k = Ed25519Identity.generate().public_key
        self.store.add("http://node1:9000", k)
        self.store.remove("http://node1:9000")
        self.assertEqual(len(self.store.list()), 0)

    def test_persistence(self):
        k = Ed25519Identity.generate().public_key
        self.store.add("http://node1:9000", k, height=7)
        store2 = PeerStore(self.path)
        peers = store2.list()
        self.assertEqual(len(peers), 1)
        self.assertEqual(peers[0].url, "http://node1:9000")
        self.assertEqual(peers[0].pubkey, k)
        self.assertEqual(peers[0].height, 7)

    def test_get_by_pubkey(self):
        k = Ed25519Identity.generate().public_key
        self.store.add("http://node1:9000", k)
        found = self.store.get_by_pubkey(k)
        self.assertIsNotNone(found)
        self.assertEqual(found.url, "http://node1:9000")
        not_found = self.store.get_by_pubkey(b"\x00" * 32)
        self.assertIsNone(not_found)

    def test_prune_stale(self):
        k = Ed25519Identity.generate().public_key
        self.store.add("http://node1:9000", k)
        self.store.peers["http://node1:9000"].last_seen = time.time() - 1000
        pruned = self.store.prune_stale(max_age_sec=100)
        self.assertEqual(pruned, 1)
        self.assertEqual(len(self.store.list()), 0)

    def test_mark_seen(self):
        k = Ed25519Identity.generate().public_key
        self.store.add("http://node1:9000", k, height=1)
        self.store.mark_seen("http://node1:9000", height=10)
        p = self.store.list()[0]
        self.assertEqual(p.height, 10)
        self.assertEqual(p.failed_pings, 0)

    def test_increment_failed(self):
        k = Ed25519Identity.generate().public_key
        self.store.add("http://node1:9000", k)
        self.assertEqual(self.store.increment_failed("http://node1:9000"), 1)
        self.assertEqual(self.store.increment_failed("http://node1:9000"), 2)


class ImportBlocksTests(unittest.TestCase):
    def setUp(self):
        self.identity = Ed25519Identity.generate()
        self.chain = AppChain(ChainConfig(validator_pubkeys=(self.identity.public_key,)))
        self.chain.submit(TransactionHeader.create(NODE_AUTH, self.identity, sha256_bytes(b"auth")))

    def _make_auth_tx(self, extra: bytes = b"") -> bytes:
        id2 = Ed25519Identity.generate()
        validator_chain = AppChain(ChainConfig(validator_pubkeys=(id2.public_key,)))
        tx = TransactionHeader.create(NODE_AUTH, id2, sha256_bytes(b"peer-node" + extra))
        validator_chain.submit(tx)
        return validator_chain.raw_transactions[-1]

    def test_import_empty(self):
        self.assertEqual(self.chain.import_blocks([]), 0)

    def test_import_single_block(self):
        packed = self.chain.raw_transactions[0]
        chain2 = AppChain(ChainConfig())
        count = chain2.import_blocks([packed])
        self.assertEqual(count, 1)
        self.assertEqual(len(chain2.blocks), 1)
        self.assertEqual(len(chain2.authenticated_nodes), 1)

    def test_import_validates_signature(self):
        packed = self.chain.raw_transactions[0]
        bad_packed = packed[:4] + b"\xff" + packed[5:]
        chain2 = AppChain(ChainConfig())
        with self.assertRaises(ValueError):
            chain2.import_blocks([bad_packed])

    def test_import_validates_size(self):
        chain2 = AppChain(ChainConfig())
        with self.assertRaises(ValueError):
            chain2.import_blocks([b"too-small"])

    def test_import_multiple_blocks(self):
        tx2 = TransactionHeader.create(PAYLOAD_COMMIT, self.identity, sha256_bytes(b"p1"), sha256_bytes(b"r1"))
        self.chain.submit(tx2)
        all_packed = list(self.chain.raw_transactions)
        chain2 = AppChain(ChainConfig())
        count = chain2.import_blocks(all_packed)
        self.assertEqual(count, 2)
        self.assertEqual(len(chain2.payload_roots), 1)

    def test_import_continues_existing_chain(self):
        chain2 = AppChain(ChainConfig())
        packed1 = self.chain.raw_transactions[0]
        chain2.import_blocks([packed1])
        old_height = chain2.height
        id2 = Ed25519Identity.generate()
        tx2 = TransactionHeader.create(NODE_AUTH, id2, sha256_bytes(b"node2"))
        self.chain.submit(tx2)
        packed2 = self.chain.raw_transactions[-1]
        chain2.import_blocks([packed2])
        self.assertEqual(chain2.height, old_height + 1)

    def test_import_rejects_bad_sig(self):
        chain2 = AppChain(ChainConfig())
        bad_packed = self.chain.raw_transactions[0][:10] + b"\x00" + self.chain.raw_transactions[0][11:]
        with self.assertRaises(ValueError):
            chain2.import_blocks([bad_packed])

    def test_import_rejects_critical_error(self):
        bad_tx_packed = self.chain.raw_transactions[0]
        tx = TransactionHeader.unpack(bad_tx_packed)
        tampered = TransactionHeader(
            transaction_type=APP_SIG_VERIFY,
            sender_pubkey=tx.sender_pubkey,
            block_timestamp=tx.block_timestamp,
            payload_hash=sha256_bytes(b"not-approved"),
            merkle_root=tx.merkle_root,
            digital_signature=tx.digital_signature,
        )
        fake_identity = Ed25519Identity.from_private_bytes(self.identity.private_seed)
        tampered_signed = TransactionHeader.create(
            APP_SIG_VERIFY, fake_identity, sha256_bytes(b"not-approved")
        )
        packed = tampered_signed.pack()
        chain2 = AppChain(ChainConfig(validator_pubkeys=(self.identity.public_key,)))
        chain2.submit(TransactionHeader.create(NODE_AUTH, self.identity, sha256_bytes(b"auth")))
        with self.assertRaises(ValueError):
            chain2.import_blocks([packed])


class BlocksSinceTests(unittest.TestCase):
    def setUp(self):
        self.identity = Ed25519Identity.generate()
        self.chain = AppChain(ChainConfig(validator_pubkeys=(self.identity.public_key,)))
        self.chain.submit(TransactionHeader.create(NODE_AUTH, self.identity, sha256_bytes(b"auth")))
        self.chain.submit(TransactionHeader.create(PAYLOAD_COMMIT, self.identity, sha256_bytes(b"p1"), sha256_bytes(b"r1")))

    def test_blocks_since_negative(self):
        blocks = self.chain.blocks_since(-1)
        self.assertEqual(len(blocks), self.chain.height + 1)

    def test_blocks_since_zero(self):
        blocks = self.chain.blocks_since(0)
        self.assertEqual(len(blocks), self.chain.height)

    def test_blocks_since_tip(self):
        blocks = self.chain.blocks_since(self.chain.height)
        self.assertEqual(len(blocks), 0)

    def test_blocks_since_past(self):
        blocks = self.chain.blocks_since(self.chain.height - 1)
        self.assertEqual(len(blocks), 1)


class ExportSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.identity = Ed25519Identity.generate()
        self.chain = AppChain(ChainConfig(validator_pubkeys=(self.identity.public_key,)))
        self.chain.submit(TransactionHeader.create(NODE_AUTH, self.identity, sha256_bytes(b"auth")))

    def test_snapshot_contains_fields(self):
        snap = self.chain.export_snapshot()
        self.assertIn("chain_id", snap)
        self.assertIn("height", snap)
        self.assertIn("genesis_prev_hash", snap)
        self.assertIn("authenticated_nodes", snap)
        self.assertIn("approved_app_hashes", snap)
        self.assertIn("payload_roots", snap)
        self.assertEqual(snap["chain_id"], "d31337m3-mainnet-1")
        self.assertEqual(snap["height"], 0)

    def test_snapshot_genesis_hash(self):
        snap = self.chain.export_snapshot()
        self.assertEqual(bytes.fromhex(snap["genesis_prev_hash"]), GENESIS_PREV_HASH)


class GossipWorkerTests(unittest.TestCase):
    def setUp(self):
        self.identity = Ed25519Identity.generate()
        self.store = PeerStore(Path(tempfile.mkdtemp()) / "peers.json")
        self.received: list[TransactionHeader] = []

        def on_gossip(tx: TransactionHeader) -> None:
            self.received.append(tx)

        self.worker = GossipWorker(self.identity, self.store, on_gossip=on_gossip, interval=0.1)

    def test_gossip_dedup(self):
        packed = TransactionHeader.create(
            NODE_AUTH, self.identity, sha256_bytes(b"test")
        ).pack()
        self.worker.gossip(packed)
        self.worker.gossip(packed)
        with self.worker._lock:
            self.assertEqual(len(self.worker._queue), 1)


class ChainExportImportTests(unittest.TestCase):
    def test_export_import_roundtrip(self):
        id1 = Ed25519Identity.generate()
        chain1 = AppChain(ChainConfig(validator_pubkeys=(id1.public_key,)))
        chain1.submit(TransactionHeader.create(NODE_AUTH, id1, sha256_bytes(b"auth")))
        chain1.submit(TransactionHeader.create(PAYLOAD_COMMIT, id1, sha256_bytes(b"p1"), sha256_bytes(b"r1")))

        snap = chain1.export_snapshot()
        self.assertEqual(snap["height"], 1)
        self.assertEqual(len(snap["authenticated_nodes"]), 1)
        self.assertEqual(len(snap["payload_roots"]), 1)

        blocks = chain1.blocks_since(0)
        self.assertEqual(len(blocks), 1)

        chain2 = AppChain(ChainConfig())
        chain2.import_blocks(list(chain1.raw_transactions))
        self.assertEqual(chain2.height, chain1.height)
        self.assertEqual(chain2.blocks, chain1.blocks)
        self.assertEqual(chain2.authenticated_nodes, chain1.authenticated_nodes)
        self.assertEqual(chain2.payload_roots, chain1.payload_roots)


if __name__ == "__main__":
    unittest.main()
