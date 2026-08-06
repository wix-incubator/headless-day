"""Resolve WIX site ID from env or local wix.config.json (not committed)."""

from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def get_site_id() -> str:
    site_id = os.environ.get("WIX_SITE_ID")
    if site_id:
        return site_id
    cfg_path = ROOT / "wix.config.json"
    if cfg_path.exists():
        return json.loads(cfg_path.read_text())["siteId"]
    raise SystemExit(
        "Set WIX_SITE_ID or create wix.config.json locally (see wix.config.example.json)"
    )
