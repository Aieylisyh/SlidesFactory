#!/usr/bin/env python3
"""Split style_guide.css into styles/style-guide/*.css parts."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "style_guide.css"
OUT_DIR = ROOT / "styles" / "style-guide"

CHUNKS = [
    (
        "01-tokens-base.css",
        1,
        328,
        "Design tokens (:root) + Reveal base, progress bar, slide content layer, heading defaults",
    ),
    (
        "02-layout-ui.css",
        329,
        423,
        "Typography utilities, title/section layouts, sfk-table",
    ),
    (
        "03-portfolio.css",
        424,
        1349,
        "Portfolio planning module, mesh surround, brand logo/footer",
    ),
    (
        "04-cases-interactive.css",
        1350,
        2652,
        "Content-page H2 band, case cards, chat/wechat layouts, QHD media",
    ),
    (
        "05-employment-major.css",
        2653,
        3838,
        "Employment, hits duo, mascots, major picker, closing slide",
    ),
    (
        "06-transitions-salary.css",
        3839,
        4701,
        "Transition FX overlays, portfolio axis, salary toggle/echarts",
    ),
    (
        "07-mesh-lightbox.css",
        4702,
        4871,
        "Growth timeline, chat lightbox, surround-mesh slide chrome",
    ),
    (
        "08-segment-arrow-share.css",
        4872,
        None,
        "Segment arrow component, agenda/growth layouts, share lock",
    ),
]


def main() -> None:
    lines = SRC.read_text(encoding="utf-8").splitlines()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, start, end, desc in CHUNKS:
        end_line = end if end is not None else len(lines)
        header = [
            "/* ==========================================================================",
            f"   SFK Reveal Deck — {name}",
            f"   {desc}",
            "   Part of style_guide.css split — see guides/style_guide.md §CSS Architecture",
            "   ========================================================================== */",
            "",
        ]
        body = lines[start - 1 : end_line]
        (OUT_DIR / name).write_text("\n".join(header + body) + "\n", encoding="utf-8")

    hub = [
        "/* ==========================================================================",
        "   SFK Game Animation Design — Reveal.js Custom Theme (import hub)",
        "   See guides/style_guide.md §CSS Architecture for file map & edit routing.",
        "   ========================================================================== */",
        "",
    ]
    for name, *_ in CHUNKS:
        hub.append(f'@import url("styles/style-guide/{name}");')
    hub.append("")

    SRC.write_text("\n".join(hub), encoding="utf-8")
    print(f"Split {len(lines)} lines into {len(CHUNKS)} files under {OUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
