from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class Task:
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    type: str = "crawl"
    urls: list[str] = field(default_factory=list)
    recipient_pubkey: str = ""
    status: str = "pending"
    assigned_to: str | None = None
    results: list[dict] = field(default_factory=list)
    failures: list[dict] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    assigned_at: float | None = None
    completed_at: float | None = None
    priority: int = 5
    geo_region: str = ""
    scheduled_at: float | None = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> Task:
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class TaskQueue:
    def __init__(self, data_dir: Path) -> None:
        self._path = data_dir / "tasks.json"
        self._lock = threading.Lock()
        self._tasks: dict[str, Task] = {}
        self._load()

    def create(self, type: str, urls: list[str], recipient_pubkey: str,
               priority: int = 5, geo_region: str = "") -> Task:
        with self._lock:
            task = Task(type=type, urls=urls, recipient_pubkey=recipient_pubkey,
                        priority=priority, geo_region=geo_region)
            self._tasks[task.id] = task
            self._save()
            return task

    def list_tasks(self, status: str | None = None) -> list[Task]:
        with self._lock:
            tasks = list(self._tasks.values())
        if status:
            tasks = [t for t in tasks if t.status == status]
        return tasks

    def get_task(self, task_id: str) -> Task | None:
        with self._lock:
            return self._tasks.get(task_id)

    def assign_next(self, assigned_to_pubkey: str) -> Task | None:
        with self._lock:
            now = time.time()
            pending = [t for t in self._tasks.values()
                       if t.status == "pending" and (t.scheduled_at is None or t.scheduled_at <= now)]
            if not pending:
                return None
            pending.sort(key=lambda t: (-t.priority, t.created_at))
            task = pending[0]
            task.status = "assigned"
            task.assigned_to = assigned_to_pubkey
            task.assigned_at = now
            self._save()
            return task
        return None

    def complete(self, task_id: str, results: list[dict], failures: list[dict]) -> Task | None:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            task.status = "completed"
            task.results = results
            task.failures = failures
            task.completed_at = time.time()
            self._save()
            return task

    def prune(self, keep_count: int = 1000) -> int:
        with self._lock:
            completed = sorted(
                [t for t in self._tasks.values() if t.status == "completed"],
                key=lambda t: t.completed_at or 0,
            )
            if len(completed) <= keep_count:
                return 0
            to_remove = completed[: len(completed) - keep_count]
            for t in to_remove:
                del self._tasks[t.id]
            self._save()
            return len(to_remove)

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        data = {tid: t.to_dict() for tid, t in self._tasks.items()}
        self._path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def _load(self) -> None:
        if not self._path.exists():
            return
        try:
            data = json.loads(self._path.read_text(encoding="utf-8"))
            self._tasks = {tid: Task.from_dict(d) for tid, d in data.items()}
        except (json.JSONDecodeError, TypeError):
            self._tasks = {}
