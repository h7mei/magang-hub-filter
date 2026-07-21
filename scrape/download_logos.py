#!/usr/bin/env python3
"""Download company logos locally for the MagangHub dashboard."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRAPE_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRAPE_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scrape.logo_cache import download_all_logos, load_logo_manifest, logo_cache_stats

DEFAULT_DATA_PATH = SCRAPE_DIR / "output" / "lowongan.json"


def load_records(data_path: Path) -> list[dict]:
    with data_path.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    records = payload.get("data") or []
    if not isinstance(records, list):
        raise ValueError("Dataset is missing a data array")
    return records


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download company logos for local serving.")
    parser.add_argument(
        "--data-path",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Path to lowongan.json",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=12,
        help="Concurrent download workers",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="Request timeout in seconds",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download logos even if cached locally",
    )
    args = parser.parse_args()

    if not args.data_path.exists():
        print(f"Data file not found: {args.data_path}", file=sys.stderr)
        sys.exit(1)

    records = load_records(args.data_path)
    stats_before = logo_cache_stats(records)
    print(
        f"Found {stats_before['unique_logos']} unique logos "
        f"({stats_before['cached_logos']} already cached locally)",
    )

    def report(done: int, total: int, url: str) -> None:
        percent = (done / total) * 100 if total else 100
        print(f"[{done}/{total} | {percent:5.1f}%] {url}", flush=True)

    manifest = download_all_logos(
        records,
        workers=args.workers,
        timeout=args.timeout,
        force=args.force,
        on_progress=report,
    )

    load_logo_manifest()
    stats_after = logo_cache_stats(records)
    print(
        f"Done. Cached {stats_after['cached_logos']}/{stats_after['unique_logos']} logos "
        f"({len(manifest)} manifest entries).",
    )

    if stats_after["missing_logos"]:
        print(
            f"Warning: {stats_after['missing_logos']} logos could not be downloaded.")
        sys.exit(1)


if __name__ == "__main__":
    main()
