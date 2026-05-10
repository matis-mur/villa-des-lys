#!/usr/bin/env python3
"""
Sync Villa des Lys availability from one or more Airbnb iCal feeds.

Reads URLs from environment variables (AIRBNB_ICAL_URL_1, AIRBNB_ICAL_URL_2, ...)
and writes assets/data/availability.json — a list of all blocked (booked) dates
in ISO format YYYY-MM-DD, deduplicated and sorted.

In iCal: DTEND is exclusive (the check-out morning is free).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "assets" / "data" / "availability.json"
ENV_PREFIX = "AIRBNB_ICAL_URL"


def collect_ical_urls() -> list[str]:
    urls: list[str] = []
    for key, value in os.environ.items():
        if key.startswith(ENV_PREFIX) and value.strip():
            urls.append(value.strip())
    return urls


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "villa-des-lys-sync/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_ical_date(value: str) -> date:
    return datetime.strptime(value.strip(), "%Y%m%d").date()


def extract_blocked_ranges(ics: str) -> list[tuple[date, date]]:
    ranges: list[tuple[date, date]] = []
    in_event = False
    start: date | None = None
    end: date | None = None
    for raw in ics.splitlines():
        line = raw.strip()
        if line == "BEGIN:VEVENT":
            in_event = True
            start = end = None
        elif line == "END:VEVENT":
            if in_event and start and end:
                ranges.append((start, end))
            in_event = False
        elif in_event and line.startswith("DTSTART"):
            _, _, value = line.partition(":")
            start = parse_ical_date(value)
        elif in_event and line.startswith("DTEND"):
            _, _, value = line.partition(":")
            end = parse_ical_date(value)
    return ranges


def expand(ranges: list[tuple[date, date]]) -> set[date]:
    blocked: set[date] = set()
    for start, end in ranges:
        cur = start
        while cur < end:
            blocked.add(cur)
            cur += timedelta(days=1)
    return blocked


def main() -> int:
    urls = collect_ical_urls()
    if not urls:
        # No secrets configured yet — exit successfully so the workflow doesn't
        # spam failure emails before AIRBNB_ICAL_URL_* are added in repo settings.
        print(f"No iCal URLs configured (set {ENV_PREFIX}_1, {ENV_PREFIX}_2, ... in GitHub Secrets). Skipping.")
        return 0

    blocked: set[date] = set()
    for i, url in enumerate(urls, 1):
        try:
            ics = fetch(url)
        except Exception as exc:
            print(f"Failed to fetch iCal #{i}: {exc}", file=sys.stderr)
            return 2
        ranges = extract_blocked_ranges(ics)
        added = expand(ranges)
        blocked |= added
        print(f"iCal #{i}: {len(ranges)} events, {len(added)} blocked days")

    payload = {
        "updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": len(urls),
        "blocked": sorted(d.isoformat() for d in blocked),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(payload['blocked'])} blocked days to {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
