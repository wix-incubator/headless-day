#!/usr/bin/env python3
"""Create WebTrends CMS collection (if missing) and seed items with image URLs."""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from site_config import get_site_id

COLLECTION_ID = "WebTrends"
ROOT = Path(__file__).resolve().parent.parent
SITE_ID = get_site_id()

COLLECTION_PAYLOAD = {
    "collection": {
        "id": COLLECTION_ID,
        "displayName": "Web Trends",
        "fields": [
            {"key": "title", "displayName": "Title", "type": "TEXT", "required": True},
            {"key": "slug", "displayName": "Slug", "type": "TEXT"},
            {"key": "category", "displayName": "Category", "type": "ARRAY_STRING"},
            {"key": "group", "displayName": "Group", "type": "TEXT"},
            {"key": "snippet", "displayName": "Snippet", "type": "TEXT"},
            {"key": "imageUrl", "displayName": "Image URL", "type": "URL"},
            {"key": "imageCreditLabel", "displayName": "Image Credit Label", "type": "TEXT"},
            {"key": "imageCreditUrl", "displayName": "Image Credit URL", "type": "URL"},
            {"key": "fullInsight", "displayName": "Full Insight", "type": "TEXT"},
            {"key": "wixImpact", "displayName": "Wix Impact", "type": "TEXT"},
            {"key": "metricDisplay", "displayName": "Metric Display", "type": "TEXT"},
            {"key": "metricCaption", "displayName": "Metric Caption", "type": "TEXT"},
            {"key": "metricTrend", "displayName": "Metric Trend", "type": "TEXT"},
            {"key": "metricSourceLabel", "displayName": "Metric Source Label", "type": "TEXT"},
            {"key": "metricSourceUrl", "displayName": "Metric Source URL", "type": "URL"},
            {"key": "recommendations", "displayName": "Recommendations", "type": "ARRAY_STRING"},
            {"key": "sources", "displayName": "Sources", "type": "TEXT"},
            {"key": "publishDate", "displayName": "Publish Date", "type": "DATETIME"},
        ],
        "permissions": {
            "insert": "ADMIN",
            "update": "ADMIN",
            "remove": "ADMIN",
            "read": "ANYONE",
        },
    }
}


def mint_token() -> str:
    result = subprocess.run(
        ["npx", "@wix/cli@latest", "token", "--site", SITE_ID],
        check=True,
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    return result.stdout.strip()


def api_request(token: str, method: str, path: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://www.wixapis.com{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "wix-site-id": SITE_ID,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise RuntimeError(f"HTTP {exc.code} {path}: {detail}") from exc


def load_seeded_trends() -> list[dict]:
    script = (
        "import { seededTrends } from './src/data/trends.ts';"
        "console.log(JSON.stringify(seededTrends));"
    )
    result = subprocess.run(
        ["npx", "tsx", "-e", script],
        check=True,
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    return json.loads(result.stdout)


def trend_to_cms_row(trend: dict) -> dict:
    metric = trend.get("metric") or {}
    metric_source = metric.get("source") or {}
    image = trend.get("image") or {}
    credit = image.get("credit") or {}
    return {
        "title": trend["title"],
        "slug": trend["slug"],
        "category": trend.get("category") or [],
        "group": trend.get("group") or "",
        "snippet": trend.get("snippet") or "",
        "imageUrl": image.get("url") or "",
        "imageCreditLabel": credit.get("label") or "",
        "imageCreditUrl": credit.get("url") or "",
        "fullInsight": trend.get("fullInsight") or "",
        "wixImpact": trend.get("wixImpact") or "",
        "metricDisplay": metric.get("display") or "",
        "metricCaption": metric.get("caption") or "",
        "metricTrend": metric.get("trend") or "",
        "metricSourceLabel": metric_source.get("label") or "",
        "metricSourceUrl": metric_source.get("url") or "",
        "recommendations": trend.get("recommendations") or [],
        "sources": json.dumps(trend.get("sources") or []),
        "publishDate": trend.get("publishDate") or "1970-01-01T00:00:00.000Z",
    }


def ensure_collection(token: str) -> None:
    try:
        api_request(token, "GET", f"/wix-data/v2/collections/{COLLECTION_ID}")
        print(f"✓ Collection {COLLECTION_ID} already exists")
    except RuntimeError as exc:
        if "WDE0025" not in str(exc) and "404" not in str(exc):
            raise
        print(f"+ Creating collection {COLLECTION_ID}")
        api_request(token, "POST", "/wix-data/v2/collections", COLLECTION_PAYLOAD)


def query_items(token: str) -> list[dict]:
    result = api_request(
        token,
        "POST",
        "/wix-data/v2/items/query",
        {
            "dataCollectionId": COLLECTION_ID,
            "query": {"paging": {"limit": 100}},
        },
    )
    return result.get("dataItems") or []


def bulk_insert(token: str, rows: list[dict]) -> None:
    api_request(
        token,
        "POST",
        "/wix-data/v2/bulk/items/insert",
        {
            "dataCollectionId": COLLECTION_ID,
            "dataItems": [{"data": row} for row in rows],
            "returnEntity": False,
        },
    )


def bulk_patch_images(token: str, items: list[dict], rows_by_slug: dict[str, dict]) -> None:
    patches = []
    for item in items:
        slug = (item.get("data") or {}).get("slug")
        row = rows_by_slug.get(slug)
        if not row:
            continue
        patches.append(
            {
                "dataItemId": item["id"],
                "fieldModifications": [
                    {
                        "fieldPath": "imageUrl",
                        "action": "SET_FIELD",
                        "setFieldOptions": {"value": row["imageUrl"]},
                    },
                    {
                        "fieldPath": "imageCreditLabel",
                        "action": "SET_FIELD",
                        "setFieldOptions": {"value": row["imageCreditLabel"]},
                    },
                    {
                        "fieldPath": "imageCreditUrl",
                        "action": "SET_FIELD",
                        "setFieldOptions": {"value": row["imageCreditUrl"]},
                    },
                ],
            }
        )
    if not patches:
        return
    api_request(
        token,
        "POST",
        "/wix-data/v2/bulk/items/patch",
        {"dataCollectionId": COLLECTION_ID, "patches": patches},
    )


def main() -> int:
    token = mint_token()
    trends = load_seeded_trends()
    rows = [trend_to_cms_row(t) for t in trends]
    rows_by_slug = {row["slug"]: row for row in rows}

    ensure_collection(token)
    existing = query_items(token)

    if not existing:
        print(f"+ Inserting {len(rows)} WebTrends items")
        bulk_insert(token, rows)
        existing = query_items(token)
    else:
        print(f"✓ Found {len(existing)} existing items — patching image fields")
        bulk_patch_images(token, existing, rows_by_slug)

    with_image = sum(
        1 for item in existing if (item.get("data") or {}).get("imageUrl")
    )
    print(f"✓ CMS ready — {len(existing)} items, {with_image} with imageUrl")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"✗ {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
