"""
Compress large local images used by the Reveal deck.

See guides/IMAGE_COMPRESSION_GUIDE.md for standards and workflow.

Examples:
  python scripts/compress_web_assets.py
  python scripts/compress_web_assets.py --dry-run
  python scripts/compress_web_assets.py --min-kb 50 --max-edge 1600
"""
from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ASSET_DIRS = (
    PROJECT_ROOT / "assets",
)
SKIP_PARTS = ("test-", "debug-", "pdf-page-", "_extracted")
JPEG_QUALITY = 82
WEBP_QUALITY = 85
COVER_PALETTE_COLORS = 256


def should_skip(path: Path) -> bool:
    name = path.name
    return any(part in name for part in SKIP_PARTS)


def resize_if_needed(im: Image.Image, max_edge: int) -> Image.Image:
    width, height = im.size
    longest = max(width, height)
    if longest <= max_edge:
        return im
    scale = max_edge / longest
    new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return im.resize(new_size, Image.Resampling.LANCZOS)


def compress_cover_png(path: Path, dry_run: bool) -> tuple[int, int]:
    before = path.stat().st_size
    im = Image.open(path).convert("RGB")
    palette = im.quantize(colors=COVER_PALETTE_COLORS, method=Image.Quantize.FASTOCTREE)
    buf = io.BytesIO()
    palette.save(buf, format="PNG", optimize=True, compress_level=9)
    data = buf.getvalue()
    if not dry_run and len(data) < before:
        path.write_bytes(data)
    after = len(data) if dry_run else path.stat().st_size
    return before, after


def regenerate_cover_webp(png_path: Path, dry_run: bool) -> tuple[int, int]:
    webp_path = png_path.with_suffix(".webp")
    before = webp_path.stat().st_size if webp_path.exists() else 0
    im = Image.open(png_path).convert("RGB")
    buf = io.BytesIO()
    im.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6, lossless=False)
    if not dry_run:
        webp_path.write_bytes(buf.getvalue())
    after = len(buf.getvalue()) if dry_run else webp_path.stat().st_size
    return before, after


def compress_image(path: Path, max_edge: int, dry_run: bool) -> tuple[int, int, str]:
    before = path.stat().st_size
    ext = path.suffix.lower()

    if path.name == "cover-title.png":
        after_before = compress_cover_png(path, dry_run)
        note = "cover-palette"
        if not dry_run:
            regenerate_cover_webp(path, dry_run=False)
        return after_before[0], after_before[1], note

    im = Image.open(path)
    im.load()

    if ext in (".jpg", ".jpeg"):
        im = resize_if_needed(im.convert("RGB"), max_edge)
        buf = io.BytesIO()
        im.save(
            buf,
            format="JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=True,
            subsampling=2,
        )
        note = f"jpeg {im.size[0]}x{im.size[1]}"
    elif ext == ".png":
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        if max(im.size) > max_edge:
            im = resize_if_needed(im, max_edge)
        buf = io.BytesIO()
        im.save(buf, format="PNG", optimize=True, compress_level=9)
        note = "png"
    elif ext == ".webp":
        im = (
            resize_if_needed(im.convert("RGBA"), max_edge)
            if im.mode == "RGBA"
            else resize_if_needed(im.convert("RGB"), max_edge)
        )
        buf = io.BytesIO()
        im.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)
        note = "webp"
    else:
        return before, before, "skip-ext"

    data = buf.getvalue()
    if len(data) >= before:
        return before, before, "no-gain"

    if not dry_run:
        path.write_bytes(data)
    return before, len(data), note


def iter_targets(asset_dirs: tuple[Path, ...], min_bytes: int):
    for assets_dir in asset_dirs:
        if not assets_dir.is_dir():
            continue
        for path in sorted(assets_dir.rglob("*")):
            if not path.is_file():
                continue
            if path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                continue
            if should_skip(path):
                continue
            if path.stat().st_size < min_bytes:
                continue
            yield path


def main() -> int:
    parser = argparse.ArgumentParser(description="Compress large web deck image assets.")
    parser.add_argument("--min-kb", type=int, default=80, help="Minimum file size to process (KB)")
    parser.add_argument("--max-edge", type=int, default=1920, help="Max longest edge in pixels")
    parser.add_argument("--dry-run", action="store_true", help="Report only; do not write files")
    args = parser.parse_args()

    min_bytes = args.min_kb * 1024
    results: list[tuple[str, int, int, str]] = []

    for path in iter_targets(DEFAULT_ASSET_DIRS, min_bytes):
        before, after, note = compress_image(path, args.max_edge, args.dry_run)
        if before != after:
            rel = path.relative_to(PROJECT_ROOT)
            results.append((str(rel), before, after, note))

    if not results:
        print("No files compressed (none above threshold or no size gain).")
        return 0

    prefix = "[dry-run] " if args.dry_run else ""
    print(f"{prefix}Compressed {len(results)} file(s):\n")
    total_before = 0
    total_after = 0
    for rel, before, after, note in sorted(results, key=lambda row: row[1], reverse=True):
        kb_before = before // 1024
        kb_after = after // 1024
        pct = (1 - after / before) * 100
        print(f"  {rel}: {kb_before}KB -> {kb_after}KB (-{pct:.0f}%) [{note}]")
        total_before += kb_before
        total_after += kb_after
    print(f"\nTotal: {total_before}KB -> {total_after}KB (saved {total_before - total_after}KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
