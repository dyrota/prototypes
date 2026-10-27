#!/usr/bin/env python3
"""Build each prototype into a single self-contained HTML file.

Outputs:
  <slug>/index.html          full document, served by GitHub Pages
  dist/artifact/<slug>.html  body-only page for publishing as a Claude artifact
"""
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

GAMES = [
    # slug, title, game color token, description
    ("fair-folk", "Fair Folk", "var(--ff)", "Async deckbuilder prototype: your opponent splits every hand you draw, and you choose which half to play."),
    ("loom", "Loom", "var(--lm)", "Async deckbuilder prototype: every card links two symbols, and you continue the thread your opponent left."),
    ("relay", "Relay", "var(--rl)", "Async deckbuilder prototype: race the same gauntlet, and the cards you pass up go to your rival."),
]

DOC_HEAD = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n'
)
DOC_TAIL = "\n</body></html>\n"


def build():
    template = (SRC / "page.html").read_text()
    core = (SRC / "core.js").read_text()
    shell = (SRC / "shell.js").read_text()
    (ROOT / "dist" / "artifact").mkdir(parents=True, exist_ok=True)
    for slug, title, color, desc in GAMES:
        script = "\n".join([core, (SRC / f"{slug}.js").read_text(), shell])
        page = (
            template.replace("{{TITLE}}", title)
            .replace("{{DESC}}", desc)
            .replace("{{COLOR}}", color)
            .replace("{{SCRIPT}}", script)
        )
        (ROOT / slug).mkdir(exist_ok=True)
        (ROOT / slug / "index.html").write_text(DOC_HEAD + page + DOC_TAIL)
        (ROOT / "dist" / "artifact" / f"{slug}.html").write_text(page)
        print(f"built {slug}")


if __name__ == "__main__":
    build()
