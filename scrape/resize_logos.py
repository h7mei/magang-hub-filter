#!/usr/bin/env python3
"""Resize cached company logos to a consistent square size."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRAPE_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRAPE_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scrape.logo_cache import LOGOS_DIR, normalize_logo_files


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize cached company logos to a consistent size.",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=64,
        help="Square logo size in pixels (default: 64)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Concurrent resize workers",
    )
    args = parser.parse_args()

    if not LOGOS_DIR.exists():
        print(f"Logo directory not found: {LOGOS_DIR}", file=sys.stderr)
        sys.exit(1)

    paths = sorted(path for path in LOGOS_DIR.iterdir() if path.is_file())
    print(f"Resizing {len(paths)} logos to {args.size}x{args.size}px...")

    def report(done: int, total: int, path: Path) -> None:
        percent = (done / total) * 100 if total else 100
        print(f"[{done}/{total} | {percent:5.1f}%] {path.name}", flush=True)

    resized, failed = normalize_logo_files(
        paths,
        workers=args.workers,
        size=args.size,
        on_progress=report,
    )

    print(f"Done. Resized {resized} logos, {failed} failed.")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
