from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any


GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_CX = os.getenv("GOOGLE_CX", "")
BING_API_KEY = os.getenv("BING_API_KEY", "")
DDG_ENABLED = os.getenv("DDG_ENABLED", "true").lower() == "true"


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    source_engine: str
    rank: int = 0


@dataclass
class AggregatedResult:
    title: str
    url: str
    snippet: str
    source_engines: list[str] = field(default_factory=list)
    best_rank: int = 999
    score: float = 0.0


def _fetch_json(url: str, headers: dict[str, str] | None = None, timeout: int = 10) -> dict[str, Any] | None:
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "D31337m3/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def _search_google(query: str, num_results: int = 10) -> list[SearchResult]:
    if not GOOGLE_API_KEY or not GOOGLE_CX:
        return []
    params = urllib.parse.urlencode({
        "key": GOOGLE_API_KEY,
        "cx": GOOGLE_CX,
        "q": query,
        "num": min(num_results, 10),
    })
    data = _fetch_json(f"https://www.googleapis.com/customsearch/v1?{params}")
    if not data:
        return []
    results = []
    for i, item in enumerate(data.get("items", []), 1):
        results.append(SearchResult(
            title=item.get("title", ""),
            url=item.get("link", ""),
            snippet=item.get("snippet", ""),
            source_engine="google",
            rank=i,
        ))
    return results


def _search_bing(query: str, num_results: int = 10) -> list[SearchResult]:
    if not BING_API_KEY:
        return []
    params = urllib.parse.urlencode({"q": query, "count": min(num_results, 50)})
    headers = {
        "Ocp-Apim-Subscription-Key": BING_API_KEY,
        "User-Agent": "D31337m3/1.0",
    }
    data = _fetch_json(f"https://api.bing.microsoft.com/v7.0/search?{params}", headers=headers)
    if not data:
        return []
    results = []
    for i, page in enumerate(data.get("webPages", {}).get("value", []), 1):
        results.append(SearchResult(
            title=page.get("name", ""),
            url=page.get("url", ""),
            snippet=page.get("snippet", ""),
            source_engine="bing",
            rank=i,
        ))
    return results


def _search_ddg(query: str, num_results: int = 10) -> list[SearchResult]:
    if not DDG_ENABLED:
        return []
    params = urllib.parse.urlencode({"q": query})
    headers = {"User-Agent": "D31337m3/1.0"}
    data = _fetch_json(f"https://api.duckduckgo.com/?{params}&format=json&no_html=1", headers=headers)
    if not data:
        return []
    results = []
    for i, topic in enumerate(data.get("RelatedTopics", [])[:num_results], 1):
        if isinstance(topic, dict) and "Text" in topic:
            url = topic.get("FirstURL", "")
            text = topic.get("Text", "")
            results.append(SearchResult(
                title=text[:80] if text else "",
                url=url,
                snippet=text,
                source_engine="duckduckgo",
                rank=i,
            ))
    return results


def _deduplicate_and_rank(all_results: list[SearchResult], top_n: int = 20) -> list[AggregatedResult]:
    url_map: dict[str, AggregatedResult] = {}

    for result in all_results:
        normalized_url = result.url.rstrip("/").lower()
        if normalized_url in url_map:
            agg = url_map[normalized_url]
            if result.source_engine not in agg.source_engines:
                agg.source_engines.append(result.source_engine)
            if result.rank < agg.best_rank:
                agg.best_rank = result.rank
                agg.title = result.title or agg.title
                agg.snippet = result.snippet or agg.snippet
        else:
            url_map[normalized_url] = AggregatedResult(
                title=result.title,
                url=result.url,
                snippet=result.snippet,
                source_engines=[result.source_engine],
                best_rank=result.rank,
            )

    for agg in url_map.values():
        engine_count = len(agg.source_engines)
        rank_score = max(0, 10 - agg.best_rank)
        agg.score = (engine_count * 5.0) + rank_score

    ranked = sorted(url_map.values(), key=lambda x: (-x.score, x.best_rank))
    return ranked[:top_n]


def aggregate_search(query: str, top_n: int = 20) -> dict[str, Any]:
    all_results: list[SearchResult] = []
    engines_used: list[str] = []
    engine_counts: dict[str, int] = {}

    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {}
        if GOOGLE_API_KEY and GOOGLE_CX:
            futures["google"] = pool.submit(_search_google, query)
        if BING_API_KEY:
            futures["bing"] = pool.submit(_search_bing, query)
        if DDG_ENABLED:
            futures["ddg"] = pool.submit(_search_ddg, query)

        for engine_name, future in futures.items():
            try:
                results = future.result(timeout=15)
                all_results.extend(results)
                engines_used.append(engine_name)
                engine_counts[engine_name] = len(results)
            except Exception:
                engine_counts[engine_name] = 0

    aggregated = _deduplicate_and_rank(all_results, top_n)

    results_list = []
    for i, agg in enumerate(aggregated, 1):
        results_list.append({
            "rank": i,
            "title": agg.title,
            "url": agg.url,
            "snippet": agg.snippet,
            "source_engines": agg.source_engines,
            "score": round(agg.score, 2),
        })

    return {
        "query": query,
        "results": results_list,
        "total_raw": len(all_results),
        "total_deduplicated": len(results_list),
        "engines_used": engines_used,
        "engine_counts": engine_counts,
    }
