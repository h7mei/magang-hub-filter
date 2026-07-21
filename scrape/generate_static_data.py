#!/usr/bin/env python3
"""Generate static JSON data for the frontend dashboard.

Reads the scraped listings source file, applies logo URL rewrites, and writes
JSON files under public/data/ that mirror the former API response shapes.
Also copies cached logos to public/logos/.

Usage:
    scrape/.venv/bin/python -m scrape.generate_static_data
    scrape/.venv/bin/python -m scrape.generate_static_data --data-path scrape/output/lowongan.json
"""

from __future__ import annotations
from scrape.logo_cache import (
    LOGOS_DIR,
    apply_local_logos_to_records,
    ensure_logo_manifest,
    load_logo_manifest,
    logo_cache_stats,
)

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRAPE_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRAPE_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


DEFAULT_DATA_PATH = SCRAPE_DIR / "output" / "lowongan.json"
PUBLIC_DIR = ROOT_DIR / "public"
DATA_DIR = PUBLIC_DIR / "data"
LOGOS_OUTPUT_DIR = PUBLIC_DIR / "logos"

FILTER_EXCLUDED_FIELDS = frozenset(
    {"id", "detail_url", "company_logo_url", "latitude", "longitude"}
)

SORT_OPTIONS = [
    {"value": "published_at", "label": "Published Date"},
    {"value": "position_name", "label": "Position"},
    {"value": "company_name", "label": "Company"},
    {"value": "location", "label": "Location"},
    {"value": "quota", "label": "Quota"},
    {"value": "working_days_per_week", "label": "Working Days"},
]


def collect_record_fields(records: list[dict[str, Any]]) -> set[str]:
    fields: set[str] = set()
    for record in records:
        fields.update(record.keys())
    return fields


def is_filterable_field(field: str) -> bool:
    return field not in FILTER_EXCLUDED_FIELDS


def add_distinct_value(options: dict[str, set[str]], field: str, raw: Any) -> None:
    if isinstance(raw, list):
        for item in raw:
            if item is None or item == "":
                continue
            options[field].add(str(item))
        return

    if raw is None or raw == "":
        return

    options[field].add(str(raw))


def collect_filter_options(records: list[dict[str, Any]]) -> dict[str, list[str]]:
    options: dict[str, set[str]] = {
        field: set()
        for field in collect_record_fields(records)
        if is_filterable_field(field)
    }

    for record in records:
        for field, raw in record.items():
            if not is_filterable_field(field):
                continue
            add_distinct_value(options, field, raw)

    return {field: sorted(values) for field, values in sorted(options.items())}


def serialize_record(record: dict[str, Any]) -> dict[str, Any]:
    return {
        **record,
        "education_levels_label": ", ".join(record.get("education_levels") or []),
        "study_programs_label": ", ".join(record.get("study_programs") or []),
        "days_off_label": ", ".join(record.get("days_off") or []),
    }


def rewrite_logo_urls_for_static(records: list[dict[str, Any]]) -> None:
    for record in records:
        url = record.get("company_logo_url")
        if isinstance(url, str) and url.startswith("/api/logos/"):
            record["company_logo_url"] = url.replace(
                "/api/logos/", "/logos/", 1)


def dedupe_records_by_id(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []

    for record in records:
        record_id = record.get("id")
        if isinstance(record_id, str):
            if record_id in seen:
                continue
            seen.add(record_id)
        deduped.append(record)

    return deduped


def load_records(data_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")

    with data_path.open(encoding="utf-8") as handle:
        dataset = json.load(handle)

    records = dedupe_records_by_id(list(dataset.get("data") or []))
    if LOGOS_DIR.exists():
        ensure_logo_manifest(records)
    else:
        load_logo_manifest()
    apply_local_logos_to_records(records)
    rewrite_logo_urls_for_static(records)

    return dataset, records


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")


def copy_logos() -> int:
    if not LOGOS_DIR.exists():
        LOGOS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        return 0

    if LOGOS_OUTPUT_DIR.exists():
        shutil.rmtree(LOGOS_OUTPUT_DIR)
    shutil.copytree(LOGOS_DIR, LOGOS_OUTPUT_DIR)
    return sum(1 for path in LOGOS_OUTPUT_DIR.iterdir() if path.is_file())


def build_meta(dataset: dict[str, Any], records: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "source_url": dataset.get("source_url"),
        "scraped_at": dataset.get("scraped_at"),
        "total_in_file": dataset.get("count", len(records)),
        "site_total": (dataset.get("meta") or {}).get("total"),
        "loaded_records": len(records),
        "logo_cache": logo_cache_stats(records),
        "filter_options": collect_filter_options(records),
        "sort_options": SORT_OPTIONS,
    }


def generate_static_data(data_path: Path) -> dict[str, Any]:
    dataset, records = load_records(data_path)
    generated_at = datetime.now(timezone.utc).isoformat()

    meta = build_meta(dataset, records)
    listings_payload = {
        "generated_at": generated_at,
        "source_path": str(data_path),
        "count": len(records),
        "data": [serialize_record(record) for record in records],
    }

    write_json(DATA_DIR / "meta.json", meta)
    write_json(DATA_DIR / "listings.json", listings_payload)

    copied_logos = copy_logos()

    return {
        "records": len(records),
        "meta_path": str(DATA_DIR / "meta.json"),
        "listings_path": str(DATA_DIR / "listings.json"),
        "logos_copied": copied_logos,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate static dashboard JSON for the frontend."
    )
    parser.add_argument(
        "--data-path",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help=f"Path to source listings JSON (default: {DEFAULT_DATA_PATH})",
    )
    args = parser.parse_args()

    summary = generate_static_data(args.data_path.resolve())
    print("Static dashboard data generated:")
    print(f"  records:  {summary['records']:,}")
    print(f"  meta:     {summary['meta_path']}")
    print(f"  listings: {summary['listings_path']}")
    print(f"  logos:    {summary['logos_copied']:,} files copied")


if __name__ == "__main__":
    main()
