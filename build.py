#!/usr/bin/env python3
"""Build each prototype into a single self-contained HTML file.

Outputs:
  <slug>/index.html          full document, served by GitHub Pages
  dist/artifact/<slug>.html  body-only page for publishing as a Claude artifact
"""
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

# Shared token names; each game commits to one dark look.
THEMES = {
    "fair-folk": dict(
        font="Cinzel:wght@600;800",
        css="""--display:"Cinzel",Georgia,serif;
  --bg1:#2E1745;--bg2:#0C0614;--panel:rgba(255,240,255,.05);--panel2:rgba(255,240,255,.09);--line:rgba(232,197,106,.24);
  --ink:#F4ECFA;--muted:#B9A8CA;--accent:#E8C56A;--accent-ink:#2A1530;--c:#B48BE0;--good:#7FD6A0;--bad:#F08A8A;
  --card:#F7F0E1;--card-ink:#2A1A33;--card-muted:#5C4A64;--k1:#C2902A;--k2:#8457C0;--k3:#2F8E84;--k4:#B4465F;--k5:#C2902A;
  --pa:#8FB6F0;--pb:#F0B36A;
  --tex:radial-gradient(circle at 20% 30%,rgba(232,197,106,.28) 0 1px,transparent 2px) 0 0/97px 97px,radial-gradient(circle at 70% 60%,rgba(180,139,224,.3) 0 1px,transparent 2px) 0 0/131px 131px,radial-gradient(circle at 40% 80%,rgba(255,255,255,.18) 0 1px,transparent 2px) 0 0/173px 173px;""",
    ),
    "loom": dict(
        font="Young+Serif",
        css="""--display:"Young Serif",Georgia,serif;
  --bg1:#18404A;--bg2:#06171B;--panel:rgba(233,220,195,.05);--panel2:rgba(233,220,195,.09);--line:rgba(233,220,195,.2);
  --ink:#EEF3EF;--muted:#9DB6B2;--accent:#E9CF98;--accent-ink:#13292E;--c:#5CC4B7;--good:#86D6A0;--bad:#EE8A7E;
  --card:#F4EDDE;--card-ink:#1B2B2F;--card-muted:#55666A;--k1:#5A7A81;--k2:#2A8A7E;--k3:#B57F25;--k4:#91508A;--k5:#B57F25;
  --thread:#D9564B;--sS:#E0A92E;--sM:#7F8CE8;--sL:#4FAE64;--sW:#3BA9CF;
  --tex:repeating-linear-gradient(0deg,rgba(233,220,195,.04) 0 2px,transparent 2px 7px),repeating-linear-gradient(90deg,rgba(233,220,195,.04) 0 2px,transparent 2px 7px);""",
    ),
    "cut-a-deal-2": dict(
        font="Rye",
        css="""--display:"Rye",Georgia,serif;
  --bg1:#5A1F24;--bg2:#160608;--panel:rgba(240,225,200,.05);--panel2:rgba(240,225,200,.09);--line:rgba(226,176,74,.26);
  --ink:#F5EDE0;--muted:#C9AFA4;--accent:#E2B04A;--accent-ink:#1E1606;--c:#E06A5A;--good:#8BE0A6;--bad:#F29A8C;
  --card:#F3ECDA;--card-ink:#1F1B12;--card-muted:#5B5440;--k1:#7C7F74;--k2:#B5831F;--k3:#3C6FB4;--k4:#B0433A;--k5:#4C3A63;
  --pa:#8FC8F0;--pb:#F0B36A;
  --tex:radial-gradient(ellipse 70% 50% at 50% 40%,rgba(240,140,120,.12),transparent 70%),repeating-radial-gradient(circle at 30% 30%,rgba(0,0,0,.06) 0 1px,transparent 1px 3px);""",
    ),
    "relay": dict(
        font="Pirata+One",
        css="""--display:"Pirata One","Palatino Linotype",Palatino,serif;
  --bg1:#3A2A1B;--bg2:#0C0907;--panel:rgba(255,230,190,.05);--panel2:rgba(255,230,190,.09);--line:rgba(240,164,58,.22);
  --ink:#F4EBDD;--muted:#BCAA92;--accent:#F0A43A;--accent-ink:#22150A;--c:#D8643A;--good:#8FD18F;--bad:#E8695E;
  --card:#EEE4D1;--card-ink:#241A10;--card-muted:#62523F;--k1:#857C70;--k2:#A8452F;--k3:#3C7A8A;--k4:#5E554C;--k5:#C38A1E;
  --tex:radial-gradient(ellipse 60% 40% at 50% 105%,rgba(240,164,58,.22),transparent 70%),repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 46px),repeating-linear-gradient(90deg,rgba(0,0,0,.14) 0 1px,transparent 1px 92px);""",
    ),
    "cut-a-deal": dict(
        font="Rye",
        css="""--display:"Rye",Georgia,serif;
  --bg1:#1D4A33;--bg2:#06150D;--panel:rgba(240,230,200,.05);--panel2:rgba(240,230,200,.09);--line:rgba(226,176,74,.24);
  --ink:#F3EEDF;--muted:#AFC0A9;--accent:#E2B04A;--accent-ink:#1E1606;--c:#4FBF86;--good:#8BE0A6;--bad:#EE8A7E;
  --card:#F3ECDA;--card-ink:#1F1B12;--card-muted:#5B5440;--k1:#7C7F74;--k2:#B5831F;--k3:#3C6FB4;--k4:#B0433A;--k5:#4C3A63;
  --pa:#8FC8F0;--pb:#F0B36A;
  --tex:radial-gradient(ellipse 70% 50% at 50% 40%,rgba(120,220,160,.12),transparent 70%),repeating-radial-gradient(circle at 30% 30%,rgba(0,0,0,.06) 0 1px,transparent 1px 3px);""",
    ),
    "lions-share": dict(
        font="Berkshire+Swash",
        css="""--display:"Berkshire Swash",Georgia,serif;
  --bg1:#4A1B2A;--bg2:#12060B;--panel:rgba(255,232,205,.05);--panel2:rgba(255,232,205,.09);--line:rgba(240,190,90,.24);
  --ink:#F7EEE2;--muted:#C7AFA6;--accent:#F0BE5A;--accent-ink:#2A1408;--c:#E0705A;--good:#8FDDA0;--bad:#F28A7A;
  --card:#F6EEDD;--card-ink:#24160F;--card-muted:#5E4C40;--k1:#8A7F72;--k2:#B9851C;--k3:#3A6FAF;--k4:#B4433B;--k5:#55406E;
  --pa:#8FC8F0;--pb:#F0B36A;
  --tex:radial-gradient(ellipse 70% 45% at 50% 0%,rgba(240,190,90,.14),transparent 70%),repeating-linear-gradient(135deg,rgba(255,255,255,.022) 0 2px,transparent 2px 9px);""",
    ),
}

GAMES = [
    ("fair-folk", "Fair Folk", "Async deckbuilder prototype: your opponent splits every hand you draw, and you choose which half to play."),
    ("loom", "Loom", "Async deckbuilder prototype: every card links two symbols, and you continue the thread your opponent left."),
    ("cut-a-deal", "Cut a Deal", "Async deckbuilder prototype: no shared market row. Every card the market reveals is cut into two piles, and your opponent picks first."),
    ("cut-a-deal-2", "Cut a Deal II", "Async deckbuilder prototype: cut 3 cheap and 2 premium market cards into two piles. Your opponent shops first from the pile they take, and everything they leave comes back to you."),
    ("lions-share", "Lion’s Share", "Async deckbuilder: cut every market reveal into two piles with one card face down. Your opponent takes a pile and you shop from the other."),
    ("relay", "Relay", "Async deckbuilder prototype: race the same gauntlet, and the cards you pass up go to your rival."),
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
    for slug, title, desc in GAMES:
        theme = THEMES[slug]
        script = "\n".join([core, (SRC / f"{slug}.js").read_text(), shell])
        page = (
            template.replace("{{TITLE}}", title)
            .replace("{{DESC}}", desc)
            .replace("{{FONT}}", theme["font"])
            .replace("{{THEME}}", theme["css"])
            .replace("{{SCRIPT}}", script)
        )
        (ROOT / slug).mkdir(exist_ok=True)
        (ROOT / slug / "index.html").write_text(DOC_HEAD + page + DOC_TAIL)
        (ROOT / "dist" / "artifact" / f"{slug}.html").write_text(page)
        print(f"built {slug}")


if __name__ == "__main__":
    build()
