from __future__ import annotations

import sys
from pathlib import Path

from d31337m3_chain import APP_SIG_VERIFY, AppChain, Ed25519Identity, TransactionHeader, sha256_bytes


def running_binary_hash(path: Path | None = None) -> bytes:
    target = path or Path(sys.argv[0]).resolve()
    return sha256_bytes(target.read_bytes())


def verify_before_start(chain: AppChain, identity: Ed25519Identity, executable: Path | None = None) -> None:
    digest = running_binary_hash(executable)
    transaction = TransactionHeader.create(APP_SIG_VERIFY, identity, digest)
    event = chain.submit(transaction)
    if event.code != "app_signature_verified":
        raise SystemExit(f"binary self-check failed: {event.code}")
