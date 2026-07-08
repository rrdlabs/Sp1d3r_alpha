from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass
from pathlib import Path


DEFAULT_CONFIG_TOML = """[blockchain]
chain_id = "d31337m3-mainnet-1"
consensus_mode = "proof-of-authority"
block_time_ms = 2000

[node_security]
enforce_binary_check = true
quarantine_on_mismatch = true
signature_algorithm = "Ed25519"

[privacy]
zero_knowledge_logging = true
encryption_standard = "X25519-AES-256-GCM"
"""


@dataclass(frozen=True)
class Config:
    chain_id: str = "d31337m3-mainnet-1"
    consensus_mode: str = "proof-of-authority"
    block_time_ms: int = 2000
    enforce_binary_check: bool = True
    quarantine_on_mismatch: bool = True
    signature_algorithm: str = "Ed25519"
    zero_knowledge_logging: bool = True
    encryption_standard: str = "X25519-AES-256-GCM"

    def to_toml(self) -> str:
        return DEFAULT_CONFIG_TOML


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
        try:
            directory_fd = os.open(path.parent, os.O_RDONLY)
        except PermissionError:
            directory_fd = None
        if directory_fd is not None:
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise
