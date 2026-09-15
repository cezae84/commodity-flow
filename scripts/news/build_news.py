#!/usr/bin/env python3
"""
Build the "Market brief — last 24 hours" shown on the map.

    python scripts/news/build_news.py --out news.json [--previous news.json]
    python scripts/news/build_news.py --self-test
    python scripts/news/build_news.py --demo --out .live/news.json   # offline sample, local UI work only

Three steps, each kept separate so the last one can refuse the second:

1. Collect — headlines from the feeds in data/live/news_sources.csv (publisher RSS
   feeds and Google News searches): title, publisher, link, time, short RSS
   description. Article pages are never downloaded or reproduced.
2. Summarise — Claude (Haiku 4.5 by default) receives only those headlines and
   returns 5-8 brief items through a forced tool call, each citing the ids of
   the headlines it is based on. Needs ANTHROPIC_API_KEY.
3. Validate — the project's "nothing invented" rule, applied automatically. An
   item is dropped when it cites no known headline, uses an unknown category,
   or contains a number that does not appear in the headlines it cites.

If the model call fails, or fewer than MIN_ITEMS items survive, the previous
brief (--previous) is published again marked stale. The script exits 1 only when
there is nothing at all to publish.

Standard library only, so it runs anywhere Python 3.9+ does.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES_CSV = ROOT / "data" / "live" / "news_sources.csv"
FIXTURES = Path(__file__).resolve().parent / "fixtures"

BROWSER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-haiku-4-5-20251001"
WINDOW_HOURS = 24
MAX_CANDIDATES = 90  # headlines sent to the model (cost cap)
MIN_ITEMS = 3
MAX_ITEMS = 8
CATEGORIES = ["oil", "gas-lng", "dry-bulk", "agri", "metals", "shipping", "geopolitics"]

SYSTEM_PROMPT = """You write the "Market brief — last 24 hours" of CommoditiesRoutes, a public map of \
seaborne commodity trades read by physical commodity traders.

You receive a numbered list of news headlines (id, publisher, time, title, sometimes a short description). \
Pick the 5 to 8 most important stories for commodity markets and seaborne trade: crude oil and products, \
gas and LNG, coal and iron ore, grain and fertilizers, metals, freight and shipping, and geopolitical events \
that move them (wars, sanctions, strait closures, export bans, OPEC decisions). Ignore corporate PR, \
technology features and stories without a market impact. Merge headlines about the same story into one item.

Rules — a validator rejects items that break them:
- Use ONLY the supplied headlines. No outside knowledge, no background you remember, no guesses.
- Every number you write must appear in the headlines you cite for that item. If unsure, leave numbers out.
- Cite the ids of every headline an item relies on.
- Neutral, factual English. No forecasts, no opinions, no trading advice.
- headline: at most 12 words. summary: one or two sentences, at most 45 words.
- Order items from most to least important for commodity markets.
- overview: one sentence (at most 30 words) naming the dominant theme of the day, citing its headlines.

Call the publish_brief tool exactly once."""

TOOL = {
    "name": "publish_brief",
    "description": "Publish the market brief built from the supplied headlines.",
    "input_schema": {
        "type": "object",
        "properties": {
            "overview": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "source_ids": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["text", "source_ids"],
            },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "headline": {"type": "string"},
                        "summary": {"type": "string"},
                        "category": {"type": "string", "enum": CATEGORIES},
                        "source_ids": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["headline", "summary", "category", "source_ids"],
                },
            },
        },
        "required": ["overview", "items"],
    },
}


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
def http_get(url: str, attempts: int = 2) -> bytes:
    last: Exception | None = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": BROWSER_AGENT})
            with urllib.request.urlopen(req, timeout=20) as res:
                return res.read()
        except Exception as exc:  # network errors, HTTP 4xx/5xx
            last = exc
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"GET failed: {last}")


def feed_url(source: dict) -> str:
    if source["kind"] == "google_news":
        q = urllib.parse.quote(f'{source["url_or_query"]} when:1d')
        return f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"
    return source["url_or_query"]


# ---------------------------------------------------------------------------
# Collect (pure parsing — covered by --self-test)
# ---------------------------------------------------------------------------
_TAG = re.compile(r"<[^>]+>")


def clean_text(text: str | None, limit: int = 280) -> str:
    text = html.unescape(_TAG.sub(" ", html.unescape(text or "")))
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    try:
        dt = parsedate_to_datetime(re.sub(r"\s+", " ", value))
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _child(el: ET.Element, *names: str) -> ET.Element | None:
    """First child with one of these local names (Elements with no children are falsy, so never use `or`)."""
    for name in names:
        for c in el:
            if _local(c.tag) == name:
                return c
    return None


def parse_feed(xml_bytes: bytes, source: dict) -> list[dict]:
    """RSS 2.0 or Atom → list of {title, url, publisher, published, description, feed}."""
    root = ET.fromstring(xml_bytes)
    entries = [e for e in root.iter() if _local(e.tag) in ("item", "entry")]
    out = []
    for e in entries:
        title_el, link_el = _child(e, "title"), _child(e, "link")
        title = clean_text(title_el.text if title_el is not None else "", 300)
        url = ""
        if link_el is not None:
            url = (link_el.text or link_el.get("href") or "").strip()
        date_el = _child(e, "pubDate", "published", "updated")
        published = parse_time(date_el.text if date_el is not None else None)
        desc_el = _child(e, "description", "summary")
        description = clean_text(desc_el.text if desc_el is not None else "")
        publisher = source["name"]
        if source["kind"] == "google_news":
            src_el = _child(e, "source")
            if src_el is not None and src_el.text:
                publisher = src_el.text.strip()
                suffix = f" - {publisher}"
                if title.endswith(suffix):
                    title = title[: -len(suffix)].strip()
            description = ""  # Google News descriptions only repeat the title
        if description and (description == title or description.startswith(title)):
            description = ""
        if not title or not url.startswith("http") or published is None:
            continue
        out.append(
            {
                "title": title,
                "url": url,
                "publisher": publisher,
                "published": published,
                "description": description,
                "feed": source["source_id"],
                "topic": source["topic"],
            }
        )
    return out


def _title_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()[:80]


def select_candidates(articles: list[dict], sources: list[dict], now: datetime) -> list[dict]:
    """
    Last 24 h only, deduplicated, at most max_items per feed, then feeds taken in
    turn up to MAX_CANDIDATES — so a busy Google News search cannot crowd out a
    publisher feed, and the whole day is covered, not only the last hours.
    Ids are given newest first.
    """
    since = now - timedelta(hours=WINDOW_HOURS)
    order = [s["source_id"] for s in sources]
    limits = {s["source_id"]: int(s["max_items"]) for s in sources}
    seen_urls, seen_titles = set(), set()
    queues: dict[str, list[dict]] = {}
    for a in sorted(articles, key=lambda a: a["published"], reverse=True):
        if not (since <= a["published"] <= now + timedelta(hours=1)):
            continue
        key = _title_key(a["title"])
        if a["url"] in seen_urls or key in seen_titles:
            continue
        seen_urls.add(a["url"])
        seen_titles.add(key)
        queues.setdefault(a["feed"], []).append(a)
    # Spread each feed's quota over the day: keep every k-th item when a feed has more than it can send.
    for feed, q in queues.items():
        limit = limits.get(feed, 10)
        if len(q) > limit:
            step = -(-len(q) // limit)
            queues[feed] = q[::step][:limit]
    picked: list[dict] = []
    rounds = max((len(q) for q in queues.values()), default=0)
    for i in range(rounds):
        for feed in order:
            q = queues.get(feed, [])
            if i < len(q) and len(picked) < MAX_CANDIDATES:
                picked.append(q[i])
    picked.sort(key=lambda a: a["published"], reverse=True)
    for i, a in enumerate(picked, 1):
        a["id"] = f"h{i:02d}"
    return picked


def collect(sources: list[dict], now: datetime, fetch=http_get) -> tuple[list[dict], list[dict]]:
    articles, report = [], []
    for s in sources:
        try:
            items = parse_feed(fetch(feed_url(s)), s)
            articles.extend(items)
            report.append({"id": s["source_id"], "name": s["name"], "ok": True, "items": len(items)})
            print(f"  ok     {s['source_id']:<18} {len(items)} items")
        except Exception as exc:  # one broken feed never stops the brief
            report.append({"id": s["source_id"], "name": s["name"], "ok": False, "error": str(exc)[:200]})
            print(f"  FAIL   {s['source_id']:<18} {exc}")
    return articles, report


# ---------------------------------------------------------------------------
# Summarise
# ---------------------------------------------------------------------------
def headlines_prompt(candidates: list[dict], now: datetime) -> str:
    lines = [f"Current time: {now.strftime('%Y-%m-%d %H:%M')} UTC. Headlines from the last {WINDOW_HOURS} hours:", ""]
    for a in candidates:
        line = f"[{a['id']}] {a['publisher']} · {a['published'].strftime('%d %b %H:%M')} UTC — {a['title']}"
        if a["description"]:
            line += f"\n      {a['description']}"
        lines.append(line)
    return "\n".join(lines)


def call_claude(prompt: str, api_key: str, model: str) -> tuple[dict, dict]:
    body = json.dumps(
        {
            "model": model,
            "max_tokens": 2000,
            "system": SYSTEM_PROMPT,
            "tools": [TOOL],
            "tool_choice": {"type": "tool", "name": TOOL["name"]},
            "messages": [{"role": "user", "content": prompt}],
        }
    ).encode()
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    last: Exception | None = None
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                payload = json.loads(res.read())
            break
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:300]
            last = RuntimeError(f"Anthropic API HTTP {exc.code}: {detail}")
            if exc.code not in (429, 500, 502, 503, 529):
                raise last from exc
        except Exception as exc:
            last = exc
        time.sleep(10 * (i + 1))
    else:
        raise RuntimeError(f"Anthropic API failed: {last}")
    for block in payload.get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == TOOL["name"]:
            return block["input"], payload.get("usage", {})
    raise RuntimeError("the model did not call publish_brief")


# ---------------------------------------------------------------------------
# Validate (pure — covered by --self-test)
# ---------------------------------------------------------------------------
_NUMBER = re.compile(r"\d+(?:[.,]\d+)*")


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace(" ", " ")).lower()


def number_supported(n: str, source_text: str) -> bool:
    """Same spellings as scripts/audit-routes.mjs: 1,111 · 1 111 · 1111 · 108,2 · 108.2."""
    forms = {n, n.replace(",", ""), n.replace(",", " "), n.replace(".", ","), n.replace(",", ".")}
    compact = re.sub(r"(\d)[ ,](?=\d{3}\b)", r"\1", source_text)
    pattern = lambda f: re.compile(r"(?<![\d.,])" + re.escape(f) + r"(?![\d]|[.,]\d)")
    return any(pattern(f).search(source_text) or pattern(f).search(compact) for f in forms)


def unsupported_numbers(text: str, sources: list[dict]) -> list[str]:
    source_text = _norm(" ".join(f"{a['title']} {a['description']}" for a in sources))
    return [n for n in _NUMBER.findall(text) if not number_supported(n, source_text)]


def _public_source(a: dict) -> dict:
    return {
        "title": a["title"],
        "publisher": a["publisher"],
        "url": a["url"],
        "published_at": a["published"].isoformat(timespec="minutes"),
    }


def validate(raw: dict, candidates: list[dict]) -> tuple[dict | None, list[dict], list[str]]:
    by_id = {a["id"]: a for a in candidates}
    rejected: list[str] = []

    def cited(ids) -> list[dict]:
        if not isinstance(ids, list):
            return []
        unique = list(dict.fromkeys(i for i in ids if isinstance(i, str)))
        return [by_id[i] for i in unique if i in by_id]

    items, used = [], set()
    for n, item in enumerate(raw.get("items") or [], 1):
        label = f"item {n} ({str(item.get('headline', ''))[:50]!r})"
        headline = clean_text(item.get("headline"), 140)
        summary = clean_text(item.get("summary"), 400)
        sources = cited(item.get("source_ids"))
        if not headline or not summary:
            rejected.append(f"{label}: empty headline or summary")
            continue
        if item.get("category") not in CATEGORIES:
            rejected.append(f"{label}: unknown category {item.get('category')!r}")
            continue
        if not sources:
            rejected.append(f"{label}: cites no known headline")
            continue
        unknown = [i for i in item.get("source_ids") or [] if i not in by_id]
        if unknown:
            rejected.append(f"{label}: cites unknown ids {unknown}")
            continue
        bad = unsupported_numbers(f"{headline} {summary}", sources)
        if bad:
            rejected.append(f"{label}: numbers not in the cited headlines {bad}")
            continue
        key = tuple(sorted(a["id"] for a in sources))
        if key in used:
            rejected.append(f"{label}: duplicate of an earlier item")
            continue
        used.add(key)
        items.append(
            {
                "headline": headline,
                "summary": summary,
                "category": item["category"],
                "sources": [_public_source(a) for a in sources[:4]],
            }
        )
        if len(items) == MAX_ITEMS:
            break

    overview = None
    ov = raw.get("overview") or {}
    ov_text = clean_text(ov.get("text"), 260)
    ov_sources = cited(ov.get("source_ids"))
    if ov_text and ov_sources and not unsupported_numbers(ov_text, ov_sources):
        overview = {"text": ov_text, "sources": [_public_source(a) for a in ov_sources[:4]]}
    elif ov_text:
        rejected.append("overview: no known source or numbers not in its headlines")
    return overview, items, rejected


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def load_sources(path: Path = SOURCES_CSV) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def api_key() -> str:
    """ANTHROPIC_API_KEY from the environment (GitHub secret), else from the gitignored .env for local runs."""
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    env_file = ROOT / ".env"
    if not key and env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
    return key


def build(sources, previous, now, api_key, model, fetch=http_get, summarise=call_claude) -> dict | None:
    print(f"Collecting headlines at {now.isoformat(timespec='seconds')}")
    articles, report = collect(sources, now, fetch)
    candidates = select_candidates(articles, sources, now)
    print(f"  {len(articles)} headlines collected, {len(candidates)} from the last {WINDOW_HOURS} h sent to {model}")

    base = {
        "generated_at": now.isoformat(timespec="seconds"),
        "window_hours": WINDOW_HOURS,
        "model": model,
        "feeds": report,
        "counts": {"collected": len(articles), "candidates": len(candidates)},
    }

    error = None
    if not api_key:
        error = "ANTHROPIC_API_KEY is not set"
    elif len(candidates) < MIN_ITEMS:
        error = f"only {len(candidates)} headlines in the last {WINDOW_HOURS} h"
    else:
        try:
            raw, usage = summarise(headlines_prompt(candidates, now), api_key, model)
            overview, items, rejected = validate(raw, candidates)
            for r in rejected:
                print(f"  dropped {r}")
            print(f"  {len(items)} items kept, {len(rejected)} dropped · usage {usage}")
            base["counts"].update({"items": len(items), "dropped": len(rejected)})
            base["usage"] = {k: usage.get(k) for k in ("input_tokens", "output_tokens")}
            if len(items) >= MIN_ITEMS:
                return {**base, "status": "ok", "brief_generated_at": base["generated_at"],
                        "overview": overview, "items": items}
            error = f"only {len(items)} items passed validation"
        except Exception as exc:
            error = str(exc)[:300]

    print(f"  no new brief: {error}")
    if previous.get("items"):
        return {**base, "status": "stale", "stale_reason": error,
                "brief_generated_at": previous.get("brief_generated_at") or previous.get("generated_at"),
                "model": previous.get("model", model),
                "overview": previous.get("overview"), "items": previous["items"]}
    return None


# ---------------------------------------------------------------------------
# Self-test (offline)
# ---------------------------------------------------------------------------
FIXTURE_NOW = datetime(2026, 9, 15, 18, 0, tzinfo=timezone.utc)


def _fixture_fetch(url: str) -> bytes:
    name = "google_news.xml" if "news.google.com" in url else "publisher_feed.xml"
    return (FIXTURES / name).read_bytes()


def _fixture_sources() -> list[dict]:
    return [
        {"source_id": "pub", "name": "Example Shipping Daily", "kind": "rss",
         "url_or_query": "https://example.com/feed", "topic": "shipping", "max_items": "10"},
        {"source_id": "gn", "name": "Google News — test", "kind": "google_news",
         "url_or_query": "Hormuz", "topic": "geopolitics", "max_items": "10"},
    ]


def _fixture_summarise(_prompt, _key, _model):
    return json.loads((FIXTURES / "model_response.json").read_text()), {"input_tokens": 1, "output_tokens": 1}


def self_test() -> None:
    def check(cond, msg):
        if not cond:
            raise AssertionError(msg)
        print(f"  ✓ {msg}")

    sources = _fixture_sources()
    articles, report = collect(sources, FIXTURE_NOW, _fixture_fetch)
    check(all(r["ok"] for r in report), "fixture feeds parse (RSS with CDATA and Google News)")
    gn = [a for a in articles if a["feed"] == "gn"]
    check(gn and all(a["publisher"] == "Example Wire" and not a["title"].endswith("Example Wire") for a in gn),
          "Google News: publisher taken from <source>, suffix stripped from the title")
    cands = select_candidates(articles, sources, FIXTURE_NOW)
    titles = [a["title"] for a in cands]
    check(not any("last week" in t for t in titles), "headlines older than 24 h are left out")
    check(len(titles) == len({_title_key(t) for t in titles}), "duplicate headlines are merged")
    check([a["id"] for a in cands][:2] == ["h01", "h02"], "candidates get stable ids, newest first")

    raw = json.loads((FIXTURES / "model_response.json").read_text())
    overview, items, rejected = validate(raw, cands)
    check(any("numbers not in the cited headlines" in r for r in rejected), "an item with an invented number is dropped")
    check(any("no known headline" in r or "unknown ids" in r for r in rejected), "an item citing an unknown headline is dropped")
    check(any("unknown category" in r for r in rejected), "an item with an unknown category is dropped")
    check(len(items) == 3 and overview is not None, "valid items and overview are kept")
    check(number_supported("2", "2 transits") and not number_supported("2", "12 transits")
          and number_supported("1,200", "1200 ships") and not number_supported("5", "5.5 mb/d"),
          "number matching respects whole numbers and thousand separators")

    brief = build(sources, {}, FIXTURE_NOW, "test-key", "test-model", _fixture_fetch, _fixture_summarise)
    check(brief and brief["status"] == "ok" and len(brief["items"]) == 3, "build publishes a fresh brief")

    def failing(*_):
        raise RuntimeError("API down")

    stale = build(sources, brief, FIXTURE_NOW + timedelta(hours=2), "test-key", "test-model", _fixture_fetch, failing)
    check(stale["status"] == "stale" and stale["items"] == brief["items"]
          and stale["brief_generated_at"] == brief["brief_generated_at"],
          "API failure keeps the last good brief, marked stale")
    check(build(sources, {}, FIXTURE_NOW, "", "m", _fixture_fetch, failing) is None,
          "no key and no previous brief → nothing to publish")
    print("Self-test passed.")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, help="where to write news.json")
    ap.add_argument("--previous", type=Path, help="last published news.json (kept on failure)")
    ap.add_argument("--self-test", action="store_true", help="run offline tests and exit")
    ap.add_argument("--demo", action="store_true", help="write the offline fixture brief (local UI work only)")
    args = ap.parse_args()

    if args.self_test:
        self_test()
        return 0
    if not args.out:
        ap.error("--out is required")

    if args.demo:
        now = datetime.now(timezone.utc)
        shift = now - FIXTURE_NOW
        brief = build(_fixture_sources(), {}, FIXTURE_NOW, "demo", "demo (offline fixtures)",
                      _fixture_fetch, _fixture_summarise)
        brief["demo"] = True
        brief["generated_at"] = brief["brief_generated_at"] = now.isoformat(timespec="seconds")
        for block in [b for b in [brief["overview"], *brief["items"]] if b]:
            for s in block["sources"]:
                s["published_at"] = (datetime.fromisoformat(s["published_at"]) + shift).isoformat(timespec="minutes")
    else:
        previous = {}
        if args.previous and args.previous.exists():
            try:
                previous = json.loads(args.previous.read_text())
            except json.JSONDecodeError:
                print("  previous file unreadable, ignored")
        model = os.environ.get("NEWS_MODEL") or DEFAULT_MODEL
        brief = build(load_sources(), previous, datetime.now(timezone.utc), api_key(), model)
        if brief is None:
            print("Nothing to publish.")
            return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.out.with_suffix(".tmp")
    tmp.write_text(json.dumps(brief, indent=1, ensure_ascii=False))
    tmp.replace(args.out)
    print(f"Wrote {args.out} — {brief['status']}, {len(brief['items'])} items")
    return 0


if __name__ == "__main__":
    sys.exit(main())
