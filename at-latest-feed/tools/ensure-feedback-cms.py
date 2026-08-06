#!/usr/bin/env python3
"""Ensure TrendReportFeedback + TrendFavorites CMS collections exist on staging."""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from site_config import get_site_id

ROOT = Path(__file__).resolve().parent.parent
SITE_ID = get_site_id()

COLLECTIONS = [
    {
        "id": "TrendReportFeedback",
        "displayName": "Trend Report Feedback",
        "fields": [
            {"key": "trendId", "displayName": "Trend ID", "type": "TEXT", "required": True},
            {"key": "trendTitle", "displayName": "Trend Title", "type": "TEXT"},
            {"key": "action", "displayName": "Action", "type": "TEXT", "required": True},
            {"key": "memberEmail", "displayName": "Member Email", "type": "TEXT", "required": True},
        ],
    },
    {
        "id": "TrendFavorites",
        "displayName": "Trend Favorites",
        "fields": [
            {"key": "trendId", "displayName": "Trend ID", "type": "TEXT", "required": True},
            {"key": "trendTitle", "displayName": "Trend Title", "type": "TEXT"},
            {"key": "memberEmail", "displayName": "Member Email", "type": "TEXT", "required": True},
        ],
    },
]

MEMBER_PERMS = {
    "insert": "SITE_MEMBER",
    "update": "SITE_MEMBER",
    "remove": "SITE_MEMBER",
    "read": "SITE_MEMBER",
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


def api_request(token: str, method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
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
            return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        try:
            parsed = json.loads(detail) if detail else {}
        except json.JSONDecodeError:
            parsed = {"raw": detail}
        return exc.code, parsed


def ensure_collection(token: str, spec: dict) -> None:
    collection_id = spec["id"]
    status, _ = api_request(token, "GET", f"/wix-data/v2/collections/{collection_id}")
    if status == 200:
        print(f"OK  {collection_id} already exists")
        return
    if status not in (404, 400):
        raise RuntimeError(f"Unexpected GET {collection_id}: HTTP {status}")

    payload = {
        "collection": {
            "id": collection_id,
            "displayName": spec["displayName"],
            "fields": spec["fields"],
            "permissions": MEMBER_PERMS,
        }
    }
    create_status, body = api_request(token, "POST", "/wix-data/v2/collections", payload)
    if create_status in (200, 201):
        print(f"CREATED  {collection_id}")
        return
    raise RuntimeError(f"Failed to create {collection_id}: HTTP {create_status} {body}")


def main() -> int:
    print(f"Ensuring feedback/favorites collections on site {SITE_ID}…")
    token = mint_token()
    for spec in COLLECTIONS:
        ensure_collection(token, spec)
    print("Done.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
