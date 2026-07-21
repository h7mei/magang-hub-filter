#!/usr/bin/env python3
"""Scrape MagangHub national internship listings."""

from __future__ import annotations

import argparse
import codecs
import csv
import json
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

SCRAPE_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = SCRAPE_DIR / "output"

BASE_URL = "https://maganghub.kemnaker.go.id/magang-nasional/lowongan"
DEFAULT_KEYWORD = ""
DEFAULT_DELAY = 0.5
DEFAULT_TIMEOUT = 60.0
DEFAULT_CONNECT_TIMEOUT = 15.0
DEFAULT_RETRIES = 5
DEFAULT_BACKOFF = 2.0
DEFAULT_CHECKPOINT = DEFAULT_OUTPUT_DIR / "scrape.checkpoint.json"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
)

EDUCATION_LABELS = {
    "diploma": "Diploma",
    "bachelor": "Sarjana",
    "master": "Magister",
    "doctorate": "Doktor",
    "profession": "Profesi",
}

DAY_LABELS = {
    "monday": "Senin",
    "tuesday": "Selasa",
    "wednesday": "Rabu",
    "thursday": "Kamis",
    "friday": "Jumat",
    "saturday": "Sabtu",
    "sunday": "Minggu",
}


def build_listing_url(keyword: str, page: int) -> str:
    params: dict[str, str | int] = {"keyword": keyword}
    if page > 1:
        params["page"] = page
    return f"{BASE_URL}?{urlencode(params)}"


def extract_initial_vacancies(html: str) -> dict[str, Any]:
    parts = re.findall(
        r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html, flags=re.DOTALL)
    for part in parts:
        if "initialVacancies" not in part:
            continue

        decoded = codecs.decode(part, "unicode_escape")
        marker = '"initialVacancies":'
        start = decoded.find(marker)
        if start == -1:
            continue

        payload = decoded[start + len(marker):]
        depth = 0
        end = 0
        for index, char in enumerate(payload):
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    end = index + 1
                    break

        if end == 0:
            continue

        return json.loads(payload[:end])

    raise ValueError("Could not find initialVacancies payload in page HTML")


def slugify_position_name(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower())
    return slug.strip("-") or "lowongan"


def build_detail_url(vacancy_id: str, position_name: str) -> str:
    slug = slugify_position_name(position_name)
    return f"{BASE_URL}/{slug}-{vacancy_id}"


def normalize_vacancy(raw: dict[str, Any]) -> dict[str, Any]:
    organizer = raw.get("organizer") or {}
    city = raw.get("city") or {}
    study_programs = raw.get("studyPrograms") or []

    return {
        "id": raw.get("id"),
        "position_name": raw.get("positionName"),
        "detail_url": build_detail_url(raw["id"], raw["positionName"])
        if raw.get("id") and raw.get("positionName")
        else None,
        "company_name": organizer.get("name"),
        "company_email": organizer.get("email"),
        "company_phone": organizer.get("phone"),
        "company_address": organizer.get("address"),
        "company_type": organizer.get("organizableType"),
        "company_logo_url": organizer.get("logoUrl"),
        "location": city.get("name"),
        "address": raw.get("address"),
        "latitude": raw.get("latitude"),
        "longitude": raw.get("longitude"),
        "quota": raw.get("quantityNeeded"),
        "education_levels": [
            EDUCATION_LABELS.get(level, level) for level in raw.get("educationLevels") or []
        ],
        "study_programs": [program.get("name") for program in study_programs if program.get("name")],
        "working_days_per_week": raw.get("workingDaysPerWeek"),
        "days_off": [DAY_LABELS.get(day, day) for day in raw.get("daysOff") or []],
        "task_description": raw.get("taskDescription"),
        "published_at": raw.get("publishedAt"),
        "created_at": raw.get("createdAt"),
        "updated_at": raw.get("updatedAt"),
    }


def create_session(retries: int) -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=retries,
        connect=retries,
        read=retries,
        status=retries,
        backoff_factor=DEFAULT_BACKOFF,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def fetch_page(
    session: requests.Session,
    keyword: str,
    page: int,
    timeout: float,
    connect_timeout: float,
) -> dict[str, Any]:
    response = session.get(
        build_listing_url(keyword, page),
        timeout=(connect_timeout, timeout),
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    response.raise_for_status()
    return extract_initial_vacancies(response.text)


def fetch_page_with_retry(
    session: requests.Session,
    keyword: str,
    page: int,
    timeout: float,
    connect_timeout: float,
    retries: int,
    backoff: float,
) -> dict[str, Any]:
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        read_timeout = timeout * attempt
        try:
            return fetch_page(
                session,
                keyword,
                page,
                read_timeout,
                connect_timeout,
            )
        except (requests.Timeout, requests.ConnectionError) as error:
            last_error = error
            if attempt >= retries:
                break

            wait_seconds = backoff ** attempt
            print(
                f"Page {page} timed out (attempt {attempt}/{retries}). "
                f"Retrying in {wait_seconds:.1f}s...",
                flush=True,
            )
            time.sleep(wait_seconds)

    if last_error is not None:
        raise last_error

    raise RuntimeError(f"Failed to fetch page {page}")


def save_checkpoint(
    checkpoint_path: Path,
    *,
    keyword: str,
    last_page: int,
    target_pages: int,
    meta: dict[str, Any],
    records: list[dict[str, Any]],
) -> None:
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "keyword": keyword,
        "last_page": last_page,
        "target_pages": target_pages,
        "meta": meta,
        "count": len(records),
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "data": records,
    }
    checkpoint_path.write_text(
        json.dumps(payload, ensure_ascii=False),
        encoding="utf-8",
    )


def load_checkpoint(checkpoint_path: Path) -> dict[str, Any] | None:
    if not checkpoint_path.exists():
        return None

    with checkpoint_path.open(encoding="utf-8") as handle:
        return json.load(handle)


def scrape(
    keyword: str = DEFAULT_KEYWORD,
    max_pages: int | None = None,
    delay: float = DEFAULT_DELAY,
    timeout: float = DEFAULT_TIMEOUT,
    connect_timeout: float = DEFAULT_CONNECT_TIMEOUT,
    retries: int = DEFAULT_RETRIES,
    backoff: float = DEFAULT_BACKOFF,
    checkpoint_path: Path | None = DEFAULT_CHECKPOINT,
    resume: bool = False,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    session = create_session(retries)
    start_page = 1
    records: list[dict[str, Any]] = []
    meta: dict[str, Any] = {}
    target_pages = 1

    if resume and checkpoint_path is not None:
        checkpoint = load_checkpoint(checkpoint_path)
        if checkpoint and checkpoint.get("keyword") == keyword:
            records = checkpoint.get("data") or []
            meta = checkpoint.get("meta") or {}
            start_page = int(checkpoint.get("last_page") or 0) + 1
            target_pages = int(checkpoint.get("target_pages") or 1)
            if max_pages is not None:
                target_pages = min(target_pages, max_pages)
            print(
                f"Resuming from page {start_page} with {len(records)} saved listings.",
                flush=True,
            )

    if start_page == 1:
        first_page = fetch_page_with_retry(
            session,
            keyword,
            1,
            timeout,
            connect_timeout,
            retries,
            backoff,
        )
        meta = first_page.get("meta") or {}
        last_page = int(meta.get("lastPage") or 1)
        target_pages = min(last_page, max_pages) if max_pages else last_page
        records = [normalize_vacancy(item)
                   for item in first_page.get("data") or []]

        print(
            f"Found {meta.get('total', len(records))} listings "
            f"across {target_pages} page(s).",
            flush=True,
        )

        if checkpoint_path is not None:
            save_checkpoint(
                checkpoint_path,
                keyword=keyword,
                last_page=1,
                target_pages=target_pages,
                meta=meta,
                records=records,
            )

    if start_page > target_pages:
        print(
            f"Checkpoint already complete at page {target_pages}.",
            flush=True,
        )
        return records, meta

    for page in range(max(start_page, 2), target_pages + 1):
        if delay:
            time.sleep(delay)

        payload = fetch_page_with_retry(
            session,
            keyword,
            page,
            timeout,
            connect_timeout,
            retries,
            backoff,
        )
        page_records = [normalize_vacancy(item)
                        for item in payload.get("data") or []]
        records.extend(page_records)
        print(
            f"Page {page}/{target_pages}: +{len(page_records)} listings ({len(records)} total)",
            flush=True,
        )

        if checkpoint_path is not None:
            save_checkpoint(
                checkpoint_path,
                keyword=keyword,
                last_page=page,
                target_pages=target_pages,
                meta=meta,
                records=records,
            )

    return records, meta


def save_json(records: list[dict[str, Any]], meta: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source_url": build_listing_url(DEFAULT_KEYWORD, 1),
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "meta": meta,
        "count": len(records),
        "data": records,
    }
    output_path.write_text(json.dumps(
        payload, ensure_ascii=False, indent=2), encoding="utf-8")


def save_csv(records: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "id",
        "position_name",
        "detail_url",
        "company_name",
        "company_email",
        "company_phone",
        "company_address",
        "company_type",
        "location",
        "address",
        "latitude",
        "longitude",
        "quota",
        "education_levels",
        "study_programs",
        "working_days_per_week",
        "days_off",
        "task_description",
        "published_at",
        "created_at",
        "updated_at",
        "company_logo_url",
    ]

    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            row = dict(record)
            row["education_levels"] = ", ".join(
                record["education_levels"] or [])
            row["study_programs"] = ", ".join(record["study_programs"] or [])
            row["days_off"] = ", ".join(record["days_off"] or [])
            writer.writerow(row)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape MagangHub internship listings.")
    parser.add_argument(
        "--keyword",
        default=DEFAULT_KEYWORD,
        help="Search keyword passed to the listing page.",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Limit number of pages to scrape (default: all pages).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help="Delay in seconds between page requests.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help="Read timeout in seconds for each page request.",
    )
    parser.add_argument(
        "--connect-timeout",
        type=float,
        default=DEFAULT_CONNECT_TIMEOUT,
        help="Connect timeout in seconds for each page request.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=DEFAULT_RETRIES,
        help="Number of retry attempts when a request times out or fails to connect.",
    )
    parser.add_argument(
        "--backoff",
        type=float,
        default=DEFAULT_BACKOFF,
        help="Exponential backoff base used between retry attempts.",
    )
    parser.add_argument(
        "--checkpoint",
        type=Path,
        default=DEFAULT_CHECKPOINT,
        help="Checkpoint file used to save progress after each page.",
    )
    parser.add_argument(
        "--no-checkpoint",
        action="store_true",
        help="Disable checkpoint saving.",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume scraping from the saved checkpoint.",
    )
    parser.add_argument(
        "--json-output",
        type=Path,
        default=DEFAULT_OUTPUT_DIR / "lowongan.json",
        help="Path for JSON output.",
    )
    parser.add_argument(
        "--csv-output",
        type=Path,
        default=DEFAULT_OUTPUT_DIR / "lowongan.csv",
        help="Path for CSV output.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    checkpoint_path = None if args.no_checkpoint else args.checkpoint
    records: list[dict[str, Any]] = []
    meta: dict[str, Any] = {}

    try:
        records, meta = scrape(
            keyword=args.keyword,
            max_pages=args.max_pages,
            delay=args.delay,
            timeout=args.timeout,
            connect_timeout=args.connect_timeout,
            retries=args.retries,
            backoff=args.backoff,
            checkpoint_path=checkpoint_path,
            resume=args.resume,
        )
    except requests.RequestException as error:
        print(f"Request failed: {error}", file=sys.stderr)
        if checkpoint_path is not None:
            checkpoint = load_checkpoint(checkpoint_path)
            if checkpoint:
                records = checkpoint.get("data") or []
                meta = checkpoint.get("meta") or {}
        if records:
            save_json(records, meta, args.json_output)
            save_csv(records, args.csv_output)
            print(
                f"Saved partial progress: {len(records)} listings.",
                file=sys.stderr,
            )
            if checkpoint_path is not None:
                print(
                    f"Resume later with: python -m scrape.scrape --resume --delay {args.delay}",
                    file=sys.stderr,
                )
        return 1
    except ValueError as error:
        print(f"Parse failed: {error}", file=sys.stderr)
        if checkpoint_path is not None:
            checkpoint = load_checkpoint(checkpoint_path)
            if checkpoint:
                records = checkpoint.get("data") or []
                meta = checkpoint.get("meta") or {}
        if records:
            save_json(records, meta, args.json_output)
            save_csv(records, args.csv_output)
            print(
                f"Saved partial progress: {len(records)} listings.",
                file=sys.stderr,
            )
        return 1

    save_json(records, meta, args.json_output)
    save_csv(records, args.csv_output)

    if checkpoint_path is not None and checkpoint_path.exists():
        checkpoint_path.unlink()

    print(f"Saved {len(records)} listings to:")
    print(f"- {args.json_output}")
    print(f"- {args.csv_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
