import unittest

from d31337m3_chain import (
    APP_SIG_VERIFY,
    NODE_AUTH,
    PAYLOAD_COMMIT,
    AppChain,
    ChainConfig,
    Ed25519Identity,
    TransactionHeader,
    sha256_bytes,
)
from d31337m3_chain.transaction import TRANSACTION_SIZE


class ChainTests(unittest.TestCase):
    def test_transaction_round_trip_and_signature(self):
        identity = Ed25519Identity.generate()
        tx = TransactionHeader.create(NODE_AUTH, identity, sha256_bytes(b"node"))
        packed = tx.pack()
        self.assertEqual(len(packed), TRANSACTION_SIZE)
        unpacked = TransactionHeader.unpack(packed)
        self.assertTrue(unpacked.signature_is_valid())

    def test_node_auth_and_payload_commit(self):
        identity = Ed25519Identity.generate()
        chain = AppChain(ChainConfig(validator_pubkeys=(identity.public_key,)))
        auth = TransactionHeader.create(NODE_AUTH, identity, sha256_bytes(b"auth"))
        self.assertEqual(chain.submit(auth).code, "node_authenticated")
        commit = TransactionHeader.create(PAYLOAD_COMMIT, identity, sha256_bytes(b"cipher"), sha256_bytes(b"root"))
        self.assertEqual(chain.submit(commit).code, "payload_committed")

    def test_unapproved_app_hash_quarantines_node(self):
        identity = Ed25519Identity.generate()
        chain = AppChain(ChainConfig(validator_pubkeys=(identity.public_key,)))
        chain.submit(TransactionHeader.create(NODE_AUTH, identity, sha256_bytes(b"auth")))
        event = chain.submit(TransactionHeader.create(APP_SIG_VERIFY, identity, sha256_bytes(b"unknown")))
        self.assertEqual(event.code, "quarantine")
        self.assertNotIn(identity.public_key, chain.authenticated_nodes)


if __name__ == "__main__":
    unittest.main()
