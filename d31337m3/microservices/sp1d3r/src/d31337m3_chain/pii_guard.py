from __future__ import annotations

import re

EMAIL_RE = re.compile(rb"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
SSN_RE = re.compile(rb"\b\d{3}-\d{2}-\d{4}\b")
PHONE_RE = re.compile(rb"\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b")


def contains_plaintext_pii(data: bytes) -> bool:
    return any(pattern.search(data) for pattern in (EMAIL_RE, SSN_RE, PHONE_RE))
