#!/usr/bin/env python3
"""Snapshot theory notes from the music workspace into src/content/theory/ (#2).

正本在 music workspace notes/theory/（Dropbox）；本 script 是單向快照器，可重跑
（正本更新後 re-run 即刷新快照）。轉換規則（issue #2）：

1. 第一個 `# ` H1 → frontmatter `title`（內文移除該行，由頁面 layout 渲染標題）。
2. description / series / order 來自下方 NOTES 對照表（series 分組與順序 = 理論
   體系的閱讀動線，源自 notes/theory/INDEX.md）。
3. 篇間裸 md 互連 `](<slug>.md)` → 相對路由 `](../<slug>/)`（單篇頁同住 /theory/x/
   深度，相對連結天然與部署 base 前綴無關——GitHub Pages project site 不需 rehype 改寫）。
4. 連到未遷移篇（實驗性草稿等）→ 去連結保留文字，不製造 404。

Usage: python3 scripts/migrate_notes.py [source_dir]
"""
from __future__ import annotations

import os
import re
import sys

DEFAULT_SOURCE = os.path.expanduser(
    "~/Library/CloudStorage/Dropbox/che_workspace/music/notes/theory"
)
DEST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "src", "content", "theory")

# (slug, series, order, description) — description = 各篇核心命題（一句話）。
NOTES = [
    ("music-as-language", "framing", 1,
     "混音師＝聲音的修辭學家、意義的編輯者——音樂就是語言的一種形式"),
    ("music-framing-effect", "framing", 2,
     "你聽到的是「被框架過的音樂」，不是音樂本身"),
    ("reverb-as-framing", "framing", 3,
     "Reverb 不是模擬空間，是建構「聲音屬於哪個世界」"),
    ("eq-as-framing", "framing", 4,
     "EQ 不是修正頻率，是選擇聲音如何「說話」"),
    ("compression-as-framing", "framing", 5,
     "Compression 不是控制動態，是塑造聲音的「生命節奏」"),
    ("mixing-as-refined-intuition", "epistemology", 1,
     "Expertise＝被嚴謹重塑過的直覺；規則（S2）是直覺（S1）的營養品，不是替代品"),
    ("mixing-language-cross-cultural", "epistemology", 2,
     "不同語言的 mixing vernacular 載體不同，能傳達的 qualia 也不同"),
]

MIGRATED = {slug for slug, *_ in NOTES}

# `](foo.md)` / `](foo.md#anchor)` — 同目錄裸連結（無路徑分隔者）
MD_LINK = re.compile(r"\[([^\]]+)\]\(([A-Za-z0-9_-]+)\.md(#[^)]*)?\)")


def convert_links(text: str) -> str:
    def repl(m: re.Match) -> str:
        label, slug, anchor = m.group(1), m.group(2), m.group(3) or ""
        if slug in MIGRATED:
            return f"[{label}](../{slug}/{anchor})"
        return label  # 未遷移篇：去連結保留文字，不製造 404
    return MD_LINK.sub(repl, text)


def extract_title(text: str) -> tuple[str, str]:
    lines = text.split("\n")
    for i, line in enumerate(lines):
        m = re.match(r"^#\s+(.+)$", line)
        if m:
            rest = "\n".join(lines[:i] + lines[i + 1:]).lstrip("\n")
            return m.group(1).strip(), rest
    raise ValueError("no H1 found")


def yaml_quote(s: str) -> str:
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


def main() -> int:
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not os.path.isdir(source):
        print(f"source not found: {source}", file=sys.stderr)
        return 1
    os.makedirs(DEST, exist_ok=True)
    for slug, series, order, desc in NOTES:
        src_path = os.path.join(source, f"{slug}.md")
        with open(src_path, "r", encoding="utf-8") as f:
            raw = f.read()
        title, body = extract_title(raw)
        body = convert_links(body)
        fm = (
            "---\n"
            f"title: {yaml_quote(title)}\n"
            f"description: {yaml_quote(desc)}\n"
            f"series: {series}\n"
            f"order: {order}\n"
            "---\n\n"
        )
        out = os.path.join(DEST, f"{slug}.md")
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(fm + body.rstrip("\n") + "\n")
        print(f"  ✓ {slug} ({series}#{order})")
    print(f"snapshot: {len(NOTES)} notes → src/content/theory/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
