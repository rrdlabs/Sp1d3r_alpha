from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class SearchResult:
    url: str
    payload_hash: str
    merkle_root: str
    completed_at: float = 0.0


@dataclass
class SearchQuery:
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    query: str = ""
    urls: list[str] = field(default_factory=list)
    recipient_pubkey: str = ""
    status: str = "pending"
    search_type: str = "crawl"
    task_ids: list[str] = field(default_factory=list)
    results: list[dict] = field(default_factory=list)
    failures: list[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    completed_at: float | None = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> SearchQuery:
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class SearchStore:
    def __init__(self, data_dir: Path) -> None:
        self._path = data_dir / "searches.json"
        self._lock = threading.Lock()
        self._searches: dict[str, SearchQuery] = {}
        self._load()

    def create(self, query: str, urls: list[str], recipient_pubkey: str) -> SearchQuery:
        with self._lock:
            search = SearchQuery(
                query=query,
                urls=urls,
                recipient_pubkey=recipient_pubkey,
                search_type="crawl",
            )
            self._searches[search.id] = search
            self._save()
            return search

    def create_super_search(self, query: str, recipient_pubkey: str, metadata: dict | None = None) -> SearchQuery:
        with self._lock:
            search = SearchQuery(
                query=query,
                urls=[],
                recipient_pubkey=recipient_pubkey,
                search_type="super_search",
                status="pending",
                metadata=metadata or {},
            )
            self._searches[search.id] = search
            self._save()
            return search

    def get(self, search_id: str) -> SearchQuery | None:
        with self._lock:
            return self._searches.get(search_id)

    def list_by_pubkey(self, recipient_pubkey: str) -> list[SearchQuery]:
        with self._lock:
            return [
                s for s in self._searches.values()
                if s.recipient_pubkey == recipient_pubkey
            ]

    def add_task(self, search_id: str, task_id: str) -> None:
        with self._lock:
            search = self._searches.get(search_id)
            if search and task_id not in search.task_ids:
                search.task_ids.append(task_id)
                search.status = "crawling"
                self._save()

    def add_result(self, search_id: str, result: dict) -> None:
        with self._lock:
            search = self._searches.get(search_id)
            if search:
                search.results.append(result)
                self._save()

    def add_failure(self, search_id: str, failure: dict) -> None:
        with self._lock:
            search = self._searches.get(search_id)
            if search:
                search.failures.append(failure)
                self._save()

    def add_super_result(self, search_id: str, result: dict) -> None:
        with self._lock:
            search = self._searches.get(search_id)
            if search:
                search.results.append(result)
                search.status = "completed"
                search.completed_at = time.time()
                self._save()

    def complete(self, search_id: str) -> SearchQuery | None:
        with self._lock:
            search = self._searches.get(search_id)
            if search:
                search.status = "completed"
                search.completed_at = time.time()
                self._save()
            return search

    def check_completion(self, search_id: str, task_queue) -> bool:
        with self._lock:
            search = self._searches.get(search_id)
            if not search or search.status == "completed":
                return True
            all_done = all(
                task_queue.get_task(tid) is not None and task_queue.get_task(tid).status == "completed"
                for tid in search.task_ids
            )
            if all_done and search.task_ids:
                search.status = "completed"
                search.completed_at = time.time()
                self._save()
                return True
            return False

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        data = {sid: s.to_dict() for sid, s in self._searches.items()}
        self._path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def _load(self) -> None:
        if not self._path.exists():
            return
        try:
            data = json.loads(self._path.read_text(encoding="utf-8"))
            self._searches = {sid: SearchQuery.from_dict(d) for sid, d in data.items()}
        except (json.JSONDecodeError, TypeError):
            self._searches = {}
