from __future__ import annotations

import argparse
import sys
from pathlib import Path

from d31337m3_chain import AppChain, ChainConfig, Ed25519Identity
from d31337m3_crawler.self_check import running_binary_hash, verify_before_start


def main() -> None:
    parser = argparse.ArgumentParser(prog="d31337m3-chain", description="d31337m3 AppChain CLI")
    parser.add_argument("--state", type=str, default=None, help="Path to chain state file")
    parser.add_argument("--identity", type=str, default=None, help="Path to Ed25519 identity seed hex file")
    parser.add_argument("--check-binary", action="store_true", help="Run binary self-check before startup")
    parser.add_argument("--info", action="store_true", help="Print chain state summary and exit")
    args = parser.parse_args()

    if args.identity:
        seed = Path(args.identity).read_text(encoding="utf-8").strip()
        identity = Ed25519Identity.from_private_bytes(bytes.fromhex(seed))
    else:
        identity = Ed25519Identity.generate()

    chain = AppChain(ChainConfig(), state_path=args.state)

    if args.check_binary:
        verify_before_start(chain, identity)
        print("Binary self-check passed.", file=sys.stderr)

    if args.info:
        print(f"Chain ID: {chain.config.chain_id}")
        print(f"Blocks: {len(chain.blocks)}")
        print(f"Authenticated nodes: {len(chain.authenticated_nodes)}")
        print(f"Approved app hashes: {len(chain.approved_app_hashes)}")
        print(f"Payload roots: {len(chain.payload_roots)}")
        print(f"Events: {len(chain.events)}")
        print(f"Validator keys: {len(chain.config.validator_pubkeys)}")
        return

    print(f"Node public key: {identity.public_key.hex()}", file=sys.stderr)


if __name__ == "__main__":
    main()
