#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fnmatch
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

EXCLUDE_DIRS = {
    ".git",
    ".wix",
    ".astro",
    "node_modules",
    "dist",
    ".cursor",
    ".vscode",
    ".idea",
    "__pycache__",
}

EXCLUDE_FILES = {
    "ai_context_bundle.txt",
    "package-lock.json",
}

DEFAULT_ALWAYS_INCLUDE = [
    "package.json",
    "astro.config.mjs",
    "tsconfig.json",
    "wix.config.json",
    "SPEC_V1.md",
    "SPEC_V2.md",
    "src/pages/index.astro",
    "src/layouts/Layout.astro",
    "src/types/trends.ts",
    "src/data/trends.ts",
    "src/lib/categoryChips.ts",
    "src/lib/filterState.ts",
    "src/lib/trends.ts",
    "src/lib/viewCategories.ts",
    "src/components/dashboard/WebTrendsDashboard.tsx",
    "src/components/dashboard/CategoryFilter.tsx",
    "src/components/dashboard/FilterPanel.tsx",
    "src/components/dashboard/FilterPill.tsx",
    "src/components/dashboard/TrendCard.tsx",
    "src/components/dashboard/TrendImage.tsx",
    "src/components/dashboard/TrendModal.tsx",
    "src/components/dashboard/ViewSwitcher.tsx",
    "src/components/dashboard/dashboard.module.css",
    "src/pages/feedback-admin.astro",
    "src/pages/api/favorites.ts",
    "src/pages/api/feedback.ts",
    "src/pages/api/feedback-admin.ts",
]

TEXT_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".css",
    ".scss",
    ".md",
    ".astro",
    ".html",
    ".txt",
    ".yml",
    ".yaml",
}

LANG_BY_EXT = {
    ".ts": "ts",
    ".tsx": "tsx",
    ".js": "js",
    ".jsx": "jsx",
    ".mjs": "js",
    ".cjs": "js",
    ".json": "json",
    ".css": "css",
    ".scss": "scss",
    ".md": "md",
    ".astro": "astro",
    ".html": "html",
    ".txt": "txt",
    ".yml": "yaml",
    ".yaml": "yaml",
}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def is_excluded(path: Path) -> bool:
    if path.name in EXCLUDE_FILES:
        return True
    return any(part in EXCLUDE_DIRS for part in path.parts)


def is_text_file(path: Path) -> bool:
    return path.suffix.lower() in TEXT_EXTENSIONS


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def walk_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        current_dir = Path(dirpath)
        for filename in filenames:
            path = current_dir / filename
            if is_excluded(path):
                continue
            if is_text_file(path):
                files.append(path)
    return sorted(files)


def build_tree(root: Path, max_depth: int = 4) -> str:
    lines = [root.name + "/"]

    def recurse(current: Path, prefix: str, depth: int) -> None:
        if depth > max_depth:
            return

        children: list[Path] = []
        for child in sorted(current.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
            if is_excluded(child):
                continue
            if child.is_dir() or is_text_file(child):
                children.append(child)

        for index, child in enumerate(children):
            connector = "└── " if index == len(children) - 1 else "├── "
            lines.append(prefix + connector + child.name + ("/" if child.is_dir() else ""))

            if child.is_dir():
                extension = "    " if index == len(children) - 1 else "│   "
                recurse(child, prefix + extension, depth + 1)

    recurse(root, "", 1)
    return "\n".join(lines)


def architecture_summary() -> str:
    sections = [
        "## Architecture Summary",
        "",
        "- Framework: Astro page shell with a React client island.",
        "- Entry page: `src/pages/index.astro`.",
        "- Global shell/layout: `src/layouts/Layout.astro`.",
        "- Main UI orchestrator: `src/components/dashboard/WebTrendsDashboard.tsx`.",
        "- Dashboard subcomponents:",
        "  - `FilterPanel.tsx` + `FilterPill.tsx` for hero-bar tri-state domain filters",
        "  - `CategoryFilter.tsx` for session-only Focus lens chips",
        "  - `ViewSwitcher.tsx` for Feed / Compact List / Grid layout switching",
        "  - `TrendCard.tsx` for collapsed cards and compact list rows",
        "  - `TrendModal.tsx` for expanded reports",
        "  - `TrendImage.tsx` for sourced card/modal imagery and fallbacks",
        "- Styling: `src/components/dashboard/dashboard.module.css`.",
        "- UI state:",
        "  - Domain filters are tri-state `on | neutral | off` and persist to query params.",
        "  - Focus is single-select, session-only, and backed by `src/lib/viewCategories.ts`.",
        "  - View mode persists to `localStorage`.",
        "  - Favorites and report feedback use backend API bridges for Wix CMS writes.",
        "- Chip system: `src/lib/categoryChips.ts` provides compact category labels and group color tokens.",
        "- Data contract:",
        "  - `src/types/trends.ts` defines types",
        "  - `src/data/trends.ts` contains seeded data",
        "  - `src/lib/trends.ts` exposes dashboard data access",
        "  - `src/lib/filterState.ts` contains tri-state filter and URL serialization helpers",
        "- Content source today: seeded local data shaped to match future Wix CMS fields.",
        "- Member-only features: favorites and feedback controls are hidden for anonymous dashboard visitors.",
        "- Admin route: `/feedback-admin` reads feedback through a server API path.",
        "- Deployment/runtime: Wix Managed Headless Astro project.",
    ]
    return "\n".join(sections)


def score_file(path: Path, query_terms: list[str]) -> int:
    haystack = (rel(path) + "\n" + read_text(path)).lower()
    return sum(haystack.count(term.lower()) for term in query_terms)


def select_files(
    all_files: list[Path],
    query_terms: list[str],
    include_all_src: bool,
    max_files: int,
    include_patterns: list[str],
) -> list[Path]:
    selected: dict[str, Path] = {}

    for item in DEFAULT_ALWAYS_INCLUDE:
        path = ROOT / item
        if path.exists() and path.is_file():
            selected[rel(path)] = path

    if include_all_src:
        for path in all_files:
            if rel(path).startswith("src/"):
                selected[rel(path)] = path

    if include_patterns:
        for pattern in include_patterns:
            for path in all_files:
                if fnmatch.fnmatch(rel(path), pattern):
                    selected[rel(path)] = path

    if query_terms:
        scored: list[tuple[int, Path]] = []
        for path in all_files:
            score = score_file(path, query_terms)
            if score > 0:
                scored.append((score, path))

        for _, path in sorted(scored, key=lambda pair: (-pair[0], rel(pair[1])))[:max_files]:
            selected[rel(path)] = path

    return [selected[key] for key in sorted(selected)]


def build_request_header(query_terms: list[str]) -> str:
    request = " ".join(query_terms) if query_terms else "General UI/codebase context export"
    return f"""# AI Context Bundle

Use this bundle to understand the codebase and suggest precise code edits.

## Request Context

- {request}
- This bundle includes the project tree, architecture summary, and relevant file contents.
- When proposing edits, reference files by exact path.
- Prefer minimal changes that preserve the current architecture.
"""


def language_tag(path: Path) -> str:
    return LANG_BY_EXT.get(path.suffix.lower(), "")


def render_file_block(path: Path) -> str:
    content = read_text(path).rstrip()
    return (
        f"## File: `{rel(path)}`\n\n"
        f"```{language_tag(path)}\n"
        f"{content}\n"
        f"```\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Export project context for external AI")
    parser.add_argument(
        "--query",
        default="",
        help='Keywords to focus relevant file selection, e.g. "modal chart hero"',
    )
    parser.add_argument(
        "--all-src",
        action="store_true",
        help="Include all text files under src/ in addition to the default set",
    )
    parser.add_argument(
        "--include",
        action="append",
        default=[],
        help='Additional glob pattern to include, e.g. "tools/*.py"',
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=12,
        help="Maximum extra keyword-matched files to include",
    )
    parser.add_argument(
        "--output",
        default="ai_context_bundle.txt",
        help="Output text file path, relative to the project root",
    )
    args = parser.parse_args()

    query_terms = [term.strip() for term in args.query.split() if term.strip()]
    all_files = walk_files(ROOT)
    selected_files = select_files(
        all_files=all_files,
        query_terms=query_terms,
        include_all_src=args.all_src,
        max_files=args.max_files,
        include_patterns=args.include,
    )

    sections: list[str] = []
    sections.append(build_request_header(query_terms))
    sections.append("\n## Project Tree\n")
    sections.append("```txt\n" + build_tree(ROOT) + "\n```\n")
    sections.append(architecture_summary() + "\n")
    sections.append("## Included Files\n")
    sections.extend(f"- `{rel(path)}`" for path in selected_files)
    sections.append("")
    sections.extend(render_file_block(path) for path in selected_files)

    output_path = ROOT / args.output
    output_path.write_text("\n".join(sections), encoding="utf-8")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
