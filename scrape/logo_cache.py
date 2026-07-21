"""Local company logo cache for the dashboard."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

SCRAPE_DIR = Path(__file__).resolve().parent
LOGOS_DIR = SCRAPE_DIR / "data" / "logos"
MANIFEST_PATH = SCRAPE_DIR / "data" / "logo-manifest.json"

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
LOGO_TARGET_SIZE = 64
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
)

_manifest: dict[str, str] = {}


def logo_filename_for_url(url: str) -> str:
    parsed = urlparse(url)
    ext = Path(parsed.path).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".png"
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:20]
    return f"{digest}{ext}"


def load_logo_manifest() -> dict[str, str]:
    global _manifest
    if not MANIFEST_PATH.exists():
        _manifest = {}
        return _manifest

    with MANIFEST_PATH.open(encoding="utf-8") as handle:
        payload = json.load(handle)

    if not isinstance(payload, dict):
        _manifest = {}
        return _manifest

    _manifest = {
        str(url): str(filename)
        for url, filename in payload.items()
        if isinstance(url, str) and isinstance(filename, str)
    }
    return _manifest


def save_logo_manifest(manifest: dict[str, str]) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOGOS_DIR.mkdir(parents=True, exist_ok=True)
    sorted_manifest = dict(sorted(manifest.items()))
    with MANIFEST_PATH.open("w", encoding="utf-8") as handle:
        json.dump(sorted_manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    global _manifest
    _manifest = sorted_manifest


def logo_manifest() -> dict[str, str]:
    if not _manifest:
        load_logo_manifest()
    return _manifest


def resolve_logo_url(remote_url: str | None) -> str | None:
    if not remote_url:
        return None

    filename = logo_manifest().get(remote_url)
    if filename and (LOGOS_DIR / filename).is_file():
        return f"/api/logos/{filename}"
    return remote_url


def apply_local_logos_to_records(records: list[dict[str, Any]]) -> None:
    for record in records:
        url = record.get("company_logo_url")
        if isinstance(url, str) and url:
            record["company_logo_url"] = resolve_logo_url(url) or url


def collect_unique_logo_urls(records: list[dict[str, Any]]) -> list[str]:
    urls: set[str] = set()
    for record in records:
        url = record.get("company_logo_url")
        if isinstance(url, str) and url.strip() and url.startswith("http"):
            urls.add(url.strip())
    return sorted(urls)


def create_download_session(retries: int = 3) -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=retries,
        connect=retries,
        read=retries,
        status=retries,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def normalize_logo_file(path: Path, size: int = LOGO_TARGET_SIZE) -> bool:
    """Resize a cached logo to a consistent square canvas."""
    if path.suffix.lower() == ".svg":
        return True

    try:
        from PIL import Image

        # Local cache files are trusted; some source logos are very large.
        Image.MAX_IMAGE_PIXELS = None

        with Image.open(path) as image:
            image.load()
            rgba = image.convert("RGBA")
            rgba.thumbnail((size, size), Image.Resampling.LANCZOS)

            canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
            offset = ((size - rgba.width) // 2, (size - rgba.height) // 2)
            canvas.paste(rgba, offset, rgba)

            ext = path.suffix.lower()
            if ext in {".jpg", ".jpeg"}:
                canvas.convert("RGB").save(
                    path,
                    format="JPEG",
                    quality=85,
                    optimize=True,
                )
            elif ext == ".webp":
                canvas.save(path, format="WEBP", quality=85, method=6)
            elif ext == ".gif":
                canvas.convert("P", palette=Image.Palette.ADAPTIVE).save(
                    path,
                    format="GIF",
                    optimize=True,
                )
            else:
                canvas.save(path, format="PNG", optimize=True)
        return True
    except (ImportError, OSError):
        return False


def normalize_logo_files(
    paths: list[Path],
    *,
    workers: int = 8,
    size: int = LOGO_TARGET_SIZE,
    on_progress: Callable[[int, int, Path], None] | None = None,
) -> tuple[int, int]:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    targets = [path for path in paths if path.is_file()]
    total = len(targets)
    if total == 0:
        return 0, 0

    resized = 0
    failed = 0
    completed = 0

    def worker(path: Path) -> bool:
        return normalize_logo_file(path, size=size)

    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = {executor.submit(worker, path): path for path in targets}
        for future in as_completed(futures):
            path = futures[future]
            completed += 1
            if future.result():
                resized += 1
            else:
                failed += 1
            if on_progress:
                on_progress(completed, total, path)

    return resized, failed


def download_logo(
    session: requests.Session,
    url: str,
    timeout: float = 30.0,
) -> str | None:
    filename = logo_filename_for_url(url)
    destination = LOGOS_DIR / filename
    if destination.is_file() and destination.stat().st_size > 0:
        return filename

    try:
        response = session.get(url, timeout=timeout)
    except requests.RequestException:
        return None

    if response.status_code != 200 or not response.content:
        return None

    LOGOS_DIR.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(response.content)
    normalize_logo_file(destination)
    return filename


def download_all_logos(
    records: list[dict[str, Any]],
    *,
    workers: int = 12,
    timeout: float = 30.0,
    force: bool = False,
    on_progress: Callable[[int, int, str], None] | None = None,
) -> dict[str, str]:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    manifest = {} if force else load_logo_manifest().copy()
    urls = collect_unique_logo_urls(records)
    total = len(urls)
    completed = 0

    def worker(url: str) -> tuple[str, str | None]:
        session = create_download_session()
        filename = download_logo(session, url, timeout=timeout)
        return url, filename

    pending = []
    for url in urls:
        filename = logo_filename_for_url(url)
        if not force and manifest.get(url) == filename and (LOGOS_DIR / filename).is_file():
            completed += 1
            if on_progress:
                on_progress(completed, total, url)
            continue
        pending.append(url)

    if pending:
        with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
            futures = {executor.submit(worker, url): url for url in pending}
            for future in as_completed(futures):
                url, filename = future.result()
                completed += 1
                if filename:
                    manifest[url] = filename
                    if completed % 25 == 0:
                        save_logo_manifest(manifest)
                if on_progress:
                    on_progress(completed, total, url)

    save_logo_manifest(manifest)
    return manifest


def ensure_logo_manifest(records: list[dict[str, Any]]) -> dict[str, str]:
    manifest = load_logo_manifest().copy()
    updated = False
    for url in collect_unique_logo_urls(records):
        filename = logo_filename_for_url(url)
        if (LOGOS_DIR / filename).is_file() and manifest.get(url) != filename:
            manifest[url] = filename
            updated = True
    if updated:
        save_logo_manifest(manifest)
    return manifest


def rebuild_logo_manifest(records: list[dict[str, Any]]) -> dict[str, str]:
    return ensure_logo_manifest(records)


def logo_cache_stats(records: list[dict[str, Any]]) -> dict[str, int]:
    unique_urls = collect_unique_logo_urls(records)
    manifest = logo_manifest()
    cached = sum(
        1
        for url in unique_urls
        if manifest.get(url) and (LOGOS_DIR / manifest[url]).is_file()
    )
    return {
        "unique_logos": len(unique_urls),
        "cached_logos": cached,
        "missing_logos": max(0, len(unique_urls) - cached),
    }
