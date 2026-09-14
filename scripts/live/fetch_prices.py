#!/usr/bin/env python3
"""
Fetch market prices for the map and write them to one JSON file.

    python scripts/live/fetch_prices.py --out prices.json [--previous prices.json]
    python scripts/live/fetch_prices.py --self-test

The instruments are listed in data/live/instruments.csv. Two sources:

* yahoo — Yahoo Finance chart endpoint (unofficial, delayed ~10-15 min for CME
  futures). Front-month continuous futures: the series jumps when the contract
  rolls. Displayed as "indicative".
* fred  — IMF Primary Commodity Prices (monthly) from FRED. With FRED_API_KEY
  set, the official FRED API is used (free key:
  https://fred.stlouisfed.org/docs/api/api_key.html); otherwise the public CSV
  download, which needs no key.

For each instrument: latest value, time of that value, change against the
previous close (Yahoo) or previous month (FRED), 2025 average (the map's
reference year), and a short history for a sparkline.

Nothing here is allowed to publish a broken number. A value is rejected when it
is missing, not positive, or older than `max_age_days` (some Yahoo commodity
tickers still answer but stopped trading years ago). A rejected or failed
instrument keeps its previous value from --previous, marked stale with the error.
The script exits 1 only if no instrument at all could be produced.

Standard library only, so it runs anywhere Python 3.9+ does.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
INSTRUMENTS = ROOT / "data" / "live" / "instruments.csv"
FIXTURES = Path(__file__).resolve().parent / "fixtures"

# Yahoo refuses non-browser clients; FRED's CDN stalls on a browser string.
BROWSER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
SCRIPT_AGENT = "commoditymap/1.0 (price fetcher)"
REFERENCE_YEAR = 2025
SPARK_POINTS = 30
SOURCES = {
    "yahoo": {
        "label": "Yahoo Finance",
        "quote_url": "https://finance.yahoo.com/quote/{symbol}",
        "notice": "Delayed, indicative front-month futures price",
    },
    "fred": {
        "label": "IMF Primary Commodity Prices via FRED",
        "quote_url": "https://fred.stlouisfed.org/series/{symbol}",
        "notice": "Monthly average price",
    },
}


class RejectedValue(Exception):
    """The source answered, but the value must not be published."""


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
def http_get(url: str, user_agent: str, attempts: int = 3) -> bytes:
    last: Exception | None = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": user_agent})
            with urllib.request.urlopen(req, timeout=20) as res:
                return res.read()
        except Exception as exc:  # network errors, HTTP 4xx/5xx
            last = exc
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"GET failed after {attempts} attempts: {last}")


# ---------------------------------------------------------------------------
# Parsing (pure functions — covered by --self-test)
# ---------------------------------------------------------------------------
def _round(x: float | None, digits: int = 4) -> float | None:
    return None if x is None else round(x, digits)


def _check_value(value, as_of: datetime, max_age_days: float, now: datetime) -> None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        raise RejectedValue("no value in the response")
    if value <= 0:
        raise RejectedValue(f"non-positive value {value}")
    age = (now - as_of).total_seconds() / 86400
    if age > max_age_days:
        raise RejectedValue(
            f"last value dated {as_of.date().isoformat()} is {age:.0f} days old "
            f"(max {max_age_days:g}) — ticker probably no longer trades"
        )


def parse_yahoo(payload: dict, max_age_days: float, now: datetime) -> dict:
    result = (payload.get("chart") or {}).get("result")
    if not result:
        err = (payload.get("chart") or {}).get("error")
        raise RuntimeError(f"Yahoo returned no result: {err}")
    r = result[0]
    meta = r.get("meta", {})
    tz = ZoneInfo(meta.get("exchangeTimezoneName") or "UTC")

    price = meta.get("regularMarketPrice")
    as_of = datetime.fromtimestamp(meta["regularMarketTime"], tz=timezone.utc)
    _check_value(price, as_of, max_age_days, now)

    closes = []
    quote = (r.get("indicators", {}).get("quote") or [{}])[0]
    for ts, close in zip(r.get("timestamp") or [], quote.get("close") or []):
        if close is None or close <= 0:
            continue
        day = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(tz).date()
        closes.append((day, float(close)))

    # The last daily bar is usually the session in progress: the previous close
    # is the last bar of an earlier trading day than the current quote.
    market_day = as_of.astimezone(tz).date()
    earlier = [c for c in closes if c[0] < market_day]
    prev = earlier[-1] if earlier else None
    ref = [c for d, c in closes if d.year == REFERENCE_YEAR]

    change = price - prev[1] if prev else None
    return {
        "value": _round(price),
        "as_of": as_of.isoformat(timespec="seconds"),
        "previous": _round(prev[1]) if prev else None,
        "previous_as_of": prev[0].isoformat() if prev else None,
        "change": _round(change),
        "change_pct": _round(change / prev[1] * 100, 2) if prev else None,
        "change_basis": "previous close",
        "avg_reference": _round(sum(ref) / len(ref)) if len(ref) >= 150 else None,
        "reference_points": len(ref),
        "spark": [[d.isoformat(), _round(c)] for d, c in closes[-SPARK_POINTS:]],
        "contract": meta.get("shortName"),
        "exchange": meta.get("fullExchangeName") or meta.get("exchangeName"),
        "currency": meta.get("currency"),
    }


def fred_rows_from_csv(text: str) -> list[tuple[date, float]]:
    reader = csv.reader(io.StringIO(text))
    header = next(reader, None)
    if not header or len(header) < 2:
        raise RuntimeError("FRED returned no CSV (series id wrong or page changed)")
    return [
        (date.fromisoformat(line[0]), float(line[1]))
        for line in reader
        if len(line) >= 2 and line[1] not in ("", ".")
    ]


def fred_rows_from_api(payload: dict) -> list[tuple[date, float]]:
    if "observations" not in payload:
        raise RuntimeError(f"FRED API error: {payload.get('error_message', payload)}")
    return [
        (date.fromisoformat(o["date"]), float(o["value"]))
        for o in payload["observations"]
        if o.get("value") not in (None, "", ".")
    ]


def parse_fred(rows: list[tuple[date, float]], max_age_days: float, now: datetime) -> dict:
    if not rows:
        raise RuntimeError("FRED series is empty")

    last_day, last = rows[-1]
    # A monthly observation covers the whole month: age is counted from its end.
    month_end = (
        date(last_day.year + 1, 1, 1) if last_day.month == 12
        else date(last_day.year, last_day.month + 1, 1)
    )
    as_of = datetime(month_end.year, month_end.month, month_end.day, tzinfo=timezone.utc)
    _check_value(last, as_of, max_age_days, now)

    prev = rows[-2] if len(rows) >= 2 else None
    ref = [v for d, v in rows if d.year == REFERENCE_YEAR]
    change = last - prev[1] if prev else None
    return {
        "value": _round(last),
        "as_of": last_day.isoformat(),
        "period": last_day.strftime("%Y-%m"),
        "previous": _round(prev[1]) if prev else None,
        "previous_as_of": prev[0].isoformat() if prev else None,
        "change": _round(change),
        "change_pct": _round(change / prev[1] * 100, 2) if prev else None,
        "change_basis": "previous month",
        "avg_reference": _round(sum(ref) / len(ref)) if len(ref) == 12 else None,
        "reference_points": len(ref),
        "spark": [[d.isoformat(), _round(v)] for d, v in rows[-12:]],
    }


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------
def fetch_yahoo(symbol: str, max_age_days: float, now: datetime) -> dict:
    start = int(datetime(REFERENCE_YEAR, 1, 1, tzinfo=timezone.utc).timestamp())
    params = urllib.parse.urlencode(
        {"period1": start, "period2": int(now.timestamp()) + 86400, "interval": "1d"}
    )
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?{params}"
    return parse_yahoo(json.loads(http_get(url, BROWSER_AGENT)), max_age_days, now)


def fetch_fred(series: str, max_age_days: float, now: datetime) -> dict:
    key = os.environ.get("FRED_API_KEY", "").strip()
    if key:
        params = urllib.parse.urlencode(
            {"series_id": series, "api_key": key, "file_type": "json",
             "observation_start": f"{REFERENCE_YEAR - 1}-01-01"}
        )
        url = f"https://api.stlouisfed.org/fred/series/observations?{params}"
        rows = fred_rows_from_api(json.loads(http_get(url, SCRIPT_AGENT)))
    else:
        url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={urllib.parse.quote(series)}"
        rows = fred_rows_from_csv(http_get(url, SCRIPT_AGENT).decode("utf-8"))
    return parse_fred(rows, max_age_days, now)


FETCHERS = {"yahoo": fetch_yahoo, "fred": fetch_fred}


def load_instruments(path: Path = INSTRUMENTS) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return [row for row in csv.DictReader(fh) if row.get("instrument_id")]


def build(instruments: list[dict], previous: dict, now: datetime, fetchers=FETCHERS) -> dict:
    out = {}
    failures = 0
    for inst in instruments:
        iid, source, symbol = inst["instrument_id"], inst["source"], inst["symbol"]
        src = SOURCES[source]
        base = {
            "instrument_id": iid,
            "commodity": inst["commodity"],
            "name": inst["name"],
            "unit": inst["unit"],
            "cadence": inst["cadence"],
            "symbol": symbol,
            "source": source,
            "source_label": src["label"],
            "notice": src["notice"],
            "note": inst.get("note", ""),
            "quote_url": src["quote_url"].format(symbol=urllib.parse.quote(symbol)),
        }
        try:
            data = fetchers[source](symbol, float(inst["max_age_days"]), now)
            out[iid] = {**base, **data, "stale": False, "fetched_at": now.isoformat(timespec="seconds")}
            print(f"  ok     {iid:16} {data['value']} {inst['unit']} ({data['as_of']})")
        except Exception as exc:
            failures += 1
            kept = (previous.get("instruments") or {}).get(iid)
            if kept and kept.get("value") is not None:
                out[iid] = {**kept, **base, "stale": True, "last_error": str(exc)}
                print(f"  stale  {iid:16} kept {kept['value']} — {exc}")
            else:
                print(f"  failed {iid:16} {exc}")
    return {
        "generated_at": now.isoformat(timespec="seconds"),
        "reference_year": REFERENCE_YEAR,
        "instruments": out,
        "failures": failures,
    }


# ---------------------------------------------------------------------------
# Self-test on saved responses (no network)
# ---------------------------------------------------------------------------
def self_test() -> None:
    now = datetime(2026, 9, 14, 20, 0, tzinfo=timezone.utc)
    yahoo = json.loads((FIXTURES / "yahoo_HG=F.json").read_text())
    y = parse_yahoo(yahoo, 5, now)
    assert y["value"] > 0 and y["previous"] and y["previous_as_of"] < y["as_of"][:10], y
    assert abs(y["change"] - (y["value"] - y["previous"])) < 1e-3
    assert y["avg_reference"] and y["reference_points"] >= 150

    stale = json.loads((FIXTURES / "yahoo_TIO=F.json").read_text())
    try:
        parse_yahoo(stale, 5, now)
        raise AssertionError("a years-old Yahoo quote must be rejected")
    except RejectedValue:
        pass

    f = parse_fred(fred_rows_from_csv((FIXTURES / "fred_PCOPPUSDM.csv").read_text()), 120, now)
    assert f["period"] and f["avg_reference"] and f["reference_points"] == 12, f
    api = {"observations": [{"date": "2025-%02d-01" % m, "value": str(100 + m)} for m in range(1, 13)]
           + [{"date": "2026-07-01", "value": "."}, {"date": "2026-08-01", "value": "130"}]}
    g = parse_fred(fred_rows_from_api(api), 120, now)
    assert g["value"] == 130 and g["previous"] == 112 and g["avg_reference"] == 106.5, g

    prev = {"instruments": {"copper": {"value": 1.0, "unit": "USD/lb"}}}
    def boom(*_):
        raise RuntimeError("network down")
    res = build(
        [{"instrument_id": "copper", "commodity": "metals", "name": "Copper", "source": "yahoo",
          "symbol": "HG=F", "unit": "USD/lb", "cadence": "intraday", "max_age_days": "5"}],
        prev, now, {"yahoo": boom, "fred": boom},
    )
    kept = res["instruments"]["copper"]
    assert kept["stale"] and kept["value"] == 1.0 and "network down" in kept["last_error"]
    print("self-test passed")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, help="where to write prices.json")
    ap.add_argument("--previous", type=Path, help="last published prices.json (kept on failure)")
    ap.add_argument("--self-test", action="store_true", help="run offline tests and exit")
    args = ap.parse_args()

    if args.self_test:
        self_test()
        return 0
    if not args.out:
        ap.error("--out is required")

    previous = {}
    if args.previous and args.previous.exists():
        try:
            previous = json.loads(args.previous.read_text())
        except json.JSONDecodeError:
            print("  previous file unreadable, ignored")

    instruments = load_instruments()
    now = datetime.now(timezone.utc)
    print(f"Fetching {len(instruments)} instruments at {now.isoformat(timespec='seconds')}")
    result = build(instruments, previous, now)
    if not result["instruments"]:
        print("No instrument could be produced — nothing written.")
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.out.with_suffix(".tmp")
    tmp.write_text(json.dumps(result, indent=1, ensure_ascii=False))
    tmp.replace(args.out)
    print(f"Wrote {args.out} — {len(result['instruments'])} instruments, {result['failures']} failure(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
