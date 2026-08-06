#!/usr/bin/env python3
"""Import trend cover images into Wix Media Manager via the Import File API."""

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

from site_config import get_site_id

SITE_ID = get_site_id()

IMAGES: list[tuple[str, str]] = [
    ("wix-managed-headless-default", "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80&fm=jpg"),
    ("shopify-hydrogen-remix-pressure", "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80&fm=jpg"),
    ("mcp-becomes-agent-integration-layer", "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80&fm=jpg"),
    ("remote-mcp-security-boundary", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80&fm=jpg"),
    ("agentic-payments-trust-rails", "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&fm=jpg"),
    ("bnpl-wallets-checkout-baseline", "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80&fm=jpg"),
    ("tax-compliance-realtime-checkout", "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80&fm=jpg"),
    ("accounting-erp-automation", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&fm=jpg"),
    ("developer-cli-ai-workflows", "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1200&q=80&fm=jpg"),
    ("agency-workspaces-rbac", "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&fm=jpg"),
    ("identity-consent-data-residency", "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200&q=80&fm=jpg"),
    ("edge-performance-core-web-vitals", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80&fm=jpg"),
    ("unified-inventory-oms", "https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80&fm=jpg"),
    ("supplier-network-automation", "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&q=80&fm=jpg"),
    ("geo-llmo-answer-engine-baseline", "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&q=80&fm=jpg"),
    ("marketplace-feed-syndication", "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200&q=80&fm=jpg"),
    ("first-party-telemetry-server-side", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&fm=jpg"),
    ("ai-ready-data-warehouse", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80&fm=jpg"),
]


def mint_token() -> str:
    result = subprocess.run(
        ["npx", "@wix/cli@latest", "token", "--site", SITE_ID],
        check=True,
        capture_output=True,
        text=True,
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
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def import_image(token: str, trend_id: str, url: str) -> dict:
    return api_request(
        token,
        "POST",
        "/site-media/v1/files/import",
        {
            "url": url,
            "mimeType": "image/jpeg",
            "displayName": f"{trend_id}.jpg",
        },
    )["file"]


def main() -> int:
    token = mint_token()
    results: list[dict] = []

    for trend_id, url in IMAGES:
        print(f"↑ {trend_id}", flush=True)
        try:
            file_info = import_image(token, trend_id, url)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode()
            print(f"  ✗ HTTP {exc.code}: {detail}", file=sys.stderr)
            return 1

        results.append(
            {
                "trend_id": trend_id,
                "file_id": file_info["id"],
                "image_url": file_info["url"],
                "operation_status": file_info.get("operationStatus"),
            }
        )
        print(f"  → {file_info['url']}")
        time.sleep(0.3)

    out_path = "tools/trend-image-urls.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        f.write("\n")

    print(f"\n✓ Imported {len(results)} images → {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
