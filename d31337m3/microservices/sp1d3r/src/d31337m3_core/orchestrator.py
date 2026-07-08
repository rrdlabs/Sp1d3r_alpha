from __future__ import annotations

from pathlib import Path

from .config import Config, atomic_write_text


class Orchestrator:
    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config()

    def write_config(self, path: Path) -> None:
        atomic_write_text(path, self.config.to_toml())
