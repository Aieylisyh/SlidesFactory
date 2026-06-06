"""
Extract embedded images from PDFs with correct on-page orientation.

Raw extract_image() ignores PDF display transforms (flips/rotations).
Match transforms from get_image_info() by image pixel size (not list index).

CLI examples:
  python tools/python/extract_pdf_images.py
  python tools/python/extract_pdf_images.py --pdf contents/case.pdf --out assets/pdf-extracted
  python tools/python/extract_pdf_images.py --pdf contents/a.pdf --page 5
  python tools/python/extract_pdf_images.py --pdf contents/a.pdf --page 3,5-7
  python tools/python/extract_pdf_images.py --crop-existing --out assets/pdf-extracted
"""
import argparse
import io
import math
import os
import re
import sys

import fitz
from PIL import Image

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_CONTENTS_DIR = os.path.join(PROJECT_ROOT, 'contents')
DEFAULT_OUT_DIR = os.path.join(PROJECT_ROOT, 'assets', 'pdf-extracted')


def find_pdf(contents_dir=None):
    """First PDF in contents/ (sorted by name) when --pdf is omitted."""
    root = contents_dir or DEFAULT_CONTENTS_DIR
    if not os.path.isdir(root):
        raise FileNotFoundError('Contents directory not found: {0}'.format(root))

    names = sorted(
        name for name in os.listdir(root)
        if name.lower().endswith('.pdf')
    )
    if not names:
        raise FileNotFoundError('No PDF found in {0}'.format(root))
    if len(names) > 1:
        print(
            'Warning: multiple PDFs in contents/; using "{0}". '
            'Pass --pdf explicitly.'.format(names[0]),
            file=sys.stderr
        )
    return os.path.join(root, names[0])


def resolve_path(path, base_dir=None):
    """Resolve path relative to project root or cwd."""
    if os.path.isabs(path):
        return os.path.normpath(path)
    if base_dir:
        candidate = os.path.join(base_dir, path)
        if os.path.exists(candidate):
            return os.path.normpath(candidate)
    candidate = os.path.join(PROJECT_ROOT, path)
    if os.path.exists(candidate):
        return os.path.normpath(candidate)
    return os.path.normpath(os.path.abspath(path))


def parse_page_spec(spec, page_count):
    """
    Parse 1-based page spec into sorted 0-based indices.
    Supports: "5", "3,5", "3-5", "2,4-6".
    """
    if not spec or not str(spec).strip():
        return list(range(page_count))

    indices = set()
    for part in re.split(r'[,，\s]+', str(spec).strip()):
        if not part:
            continue
        if '-' in part:
            bounds = part.split('-', 1)
            if len(bounds) != 2:
                raise ValueError('Invalid page range: {0}'.format(part))
            start = int(bounds[0])
            end = int(bounds[1])
            if start < 1 or end < start:
                raise ValueError('Invalid page range: {0}'.format(part))
            for pno in range(start, end + 1):
                if pno > page_count:
                    raise ValueError(
                        'Page {0} exceeds document page count ({1})'.format(pno, page_count)
                    )
                indices.add(pno - 1)
        else:
            pno = int(part)
            if pno < 1 or pno > page_count:
                raise ValueError(
                    'Page {0} out of range (1–{1})'.format(pno, page_count)
                )
            indices.add(pno - 1)

    return sorted(indices)


def find_transform(page, raw_width, raw_height, rect):
    """Resolve display transform for an embedded image."""
    infos = page.get_image_info()
    candidates = [
        info for info in infos
        if info.get('width') == raw_width and info.get('height') == raw_height
    ]

    if len(candidates) == 1:
        return candidates[0].get('transform')

    if rect and candidates:
        for info in candidates:
            bbox = fitz.Rect(info['bbox'])
            if (
                abs(bbox.width - rect.width) < 2
                and abs(bbox.height - rect.height) < 2
            ):
                return info.get('transform')

    return None


def apply_display_transform(image, transform):
    """Apply the PDF image display matrix to match the viewer."""
    a, b, c, d, _e, _f = transform

    if abs(b) > 0.01 or abs(c) > 0.01:
        angle = round(math.degrees(math.atan2(b, a)))
        if angle:
            image = image.rotate(-angle, expand=True)

    if a < 0:
        image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if d < 0:
        image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)

    return image


def crop_near_black_borders(image, threshold=20):
    """Trim near-black letterboxing from screenshot edges."""
    rgb = image.convert('RGB')
    width, height = rgb.size
    pixels = rgb.load()

    def row_has_content(y):
        step = max(1, width // 200)
        for x in range(0, width, step):
            r, g, b = pixels[x, y]
            if r > threshold or g > threshold or b > threshold:
                return True
        return False

    def col_has_content(x):
        step = max(1, height // 200)
        for y in range(0, height, step):
            r, g, b = pixels[x, y]
            if r > threshold or g > threshold or b > threshold:
                return True
        return False

    top = 0
    for y in range(height):
        if row_has_content(y):
            top = y
            break

    bottom = height
    for y in range(height - 1, -1, -1):
        if row_has_content(y):
            bottom = y + 1
            break

    left = 0
    for x in range(width):
        if col_has_content(x):
            left = x
            break

    right = width
    for x in range(width - 1, -1, -1):
        if col_has_content(x):
            right = x + 1
            break

    if right - left < width * 0.5 or bottom - top < height * 0.5:
        return image

    if left == 0 and top == 0 and right == width and bottom == height:
        return image

    return rgb.crop((left, top, right, bottom))


def save_image(image, out_path):
    if image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    image.save(out_path, 'JPEG', quality=92, optimize=True)


def clear_image_outputs(out_dir):
    for name in os.listdir(out_dir):
        lower = name.lower()
        if lower.endswith(('.jpeg', '.jpg', '.png')):
            os.remove(os.path.join(out_dir, name))


def extract_all(pdf_path, out_dir, page_indices=None, clear_out=True):
    """
    Extract images and per-page text sidecars.

    page_indices: 0-based page numbers to process; None = all pages.
    """
    os.makedirs(out_dir, exist_ok=True)

    if clear_out:
        clear_image_outputs(out_dir)

    doc = fitz.open(pdf_path)
    if page_indices is None:
        page_indices = list(range(doc.page_count))

    saved = 0
    for pno in page_indices:
        page = doc[pno]
        img_index = 0

        for img in page.get_images(full=True):
            xref = img[0]
            rects = page.get_image_rects(xref)
            if not rects:
                continue

            rect = rects[0]
            if rect.is_empty or rect.width < 1 or rect.height < 1:
                continue

            try:
                raw = doc.extract_image(xref)
                image = Image.open(io.BytesIO(raw['image']))
                raw_width = raw['width']
                raw_height = raw['height']
            except Exception:
                pix = page.get_pixmap(clip=rect, alpha=False)
                image = Image.open(io.BytesIO(pix.tobytes('jpeg')))
                raw_width, raw_height = image.size

            if raw_width < 200 and raw_height < 50:
                continue

            img_index += 1
            out_path = os.path.join(
                out_dir,
                'page-{0:02d}-img-{1}.jpeg'.format(pno + 1, img_index)
            )

            transform = find_transform(page, raw_width, raw_height, rect)
            if transform:
                image = apply_display_transform(image, transform)

            image = crop_near_black_borders(image)
            save_image(image, out_path)
            saved += 1

        with open(
            os.path.join(out_dir, 'page-{0:02d}.txt'.format(pno + 1)),
            'w',
            encoding='utf-8'
        ) as handle:
            handle.write(page.get_text())

    doc.close()
    return saved


def crop_existing_dir(out_dir):
    updated = 0
    for name in sorted(os.listdir(out_dir)):
        if not name.lower().endswith(('.jpeg', '.jpg', '.png')):
            continue
        path = os.path.join(out_dir, name)
        image = Image.open(path)
        cropped = crop_near_black_borders(image)
        if cropped.size != image.size:
            save_image(cropped, path)
            updated += 1
            print('cropped', name, image.size, '->', cropped.size)
    return updated


def build_parser():
    parser = argparse.ArgumentParser(
        description='Extract PDF embedded images with display-transform correction.'
    )
    parser.add_argument(
        '--pdf',
        metavar='PATH',
        help='PDF file path (default: first PDF in contents/)'
    )
    parser.add_argument(
        '--out',
        metavar='DIR',
        default=DEFAULT_OUT_DIR,
        help='Output directory (default: assets/pdf-extracted)'
    )
    parser.add_argument(
        '--page',
        metavar='SPEC',
        help='1-based pages to extract: e.g. 5, or 3,5-7 (default: all pages)'
    )
    parser.add_argument(
        '--contents-dir',
        metavar='DIR',
        default=DEFAULT_CONTENTS_DIR,
        help='Directory scanned when --pdf is omitted (default: contents/)'
    )
    parser.add_argument(
        '--keep-existing',
        action='store_true',
        help='Do not delete existing JPEG/PNG in --out before extract'
    )
    parser.add_argument(
        '--crop-existing',
        action='store_true',
        help='Re-crop border on images already in --out; no PDF read'
    )
    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    out_dir = resolve_path(args.out, PROJECT_ROOT)
    os.makedirs(out_dir, exist_ok=True)

    if args.crop_existing:
        updated = crop_existing_dir(out_dir)
        print('Updated {0} images in {1}'.format(updated, out_dir))
        return 0

    if args.pdf:
        pdf_path = resolve_path(args.pdf, PROJECT_ROOT)
    else:
        pdf_path = find_pdf(resolve_path(args.contents_dir, PROJECT_ROOT))

    if not os.path.isfile(pdf_path):
        print('PDF not found: {0}'.format(pdf_path), file=sys.stderr)
        return 1

    doc = fitz.open(pdf_path)
    page_count = doc.page_count
    doc.close()

    try:
        page_indices = parse_page_spec(args.page, page_count)
    except ValueError as err:
        print(str(err), file=sys.stderr)
        return 1

    count = extract_all(
        pdf_path,
        out_dir,
        page_indices=page_indices,
        clear_out=not args.keep_existing
    )
    pages_label = args.page if args.page else 'all'
    print(
        'Extracted {0} images from {1} (pages: {2}) -> {3}'.format(
            count, pdf_path, pages_label, out_dir
        )
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
