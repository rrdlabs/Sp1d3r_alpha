from __future__ import annotations

from .crypto import sha256_bytes


def merkle_root(leaves: list[bytes]) -> bytes:
    if not leaves:
        return b"\x00" * 32
    level = [sha256_bytes(leaf) if len(leaf) != 32 else leaf for leaf in leaves]
    while len(level) > 1:
        if len(level) % 2 == 1:
            level.append(level[-1])
        level = [
            sha256_bytes(level[index] + level[index + 1])
            for index in range(0, len(level), 2)
        ]
    return level[0]
