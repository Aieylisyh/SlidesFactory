#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Generate styled Chinese syllabus PDF from Markdown.
Pipeline: Markdown -> HTML (inline CSS + base64 logo) -> PDF (Edge headless)
"""

import markdown
import base64
import subprocess
import os
import sys
import uuid
import shutil
from pathlib import Path

# ── Config ──
PROJECT_ROOT = Path(r'D:\SFK\SuperTool\幻灯片生成工坊\Project')
MD_PATH      = PROJECT_ROOT / 'summerschool' / 'data' / 'syllabus-zh-CN.md'
LOGO_PATH    = PROJECT_ROOT / 'assets' / 'logos' / 'sfk logo.png'
OUTPUT_PDF   = PROJECT_ROOT / 'assets' / 'summerschool' / 'SFK-2026-Summer-Workshop-Syllabus-Module-2-zh-CN.pdf'
EDGE_PATH    = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
TEMP_DIR     = Path(os.environ.get('TEMP', r'C:\Temp'))

BRAND_COLOR    = '#F0521E'
BRAND_LIGHT    = '#FF8E5C'
BRAND_BG_LIGHT = '#FFF9F5'
TEXT_COLOR     = '#2C2C2C'


def load_logo(logo_path: Path, width_mm: float = 36):
    from PIL import Image
    img = Image.open(logo_path)
    ratio = img.width / img.height
    height_mm = width_mm / ratio
    with open(logo_path, 'rb') as f:
        logo_b64 = base64.b64encode(f.read()).decode('ascii')
    data_uri = f'data:image/png;base64,{logo_b64}'
    return data_uri, width_mm, height_mm


def build_css(logo_w_mm, logo_h_mm, brand=BRAND_COLOR):
    return f"""
@page {{
  size: A4;
  margin: 16mm 12mm 18mm 12mm;
}}

* {{ margin: 0; padding: 0; box-sizing: border-box; }}

html, body {{
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}}

body {{
  font-family: "Microsoft YaHei", "微软雅黑", "Segoe UI", sans-serif;
  color: {TEXT_COLOR};
  font-size: 12.8pt;
  line-height: 1.75;
}}

/* ── Page header (page 1 only) ── */
.page-header {{
  position: relative;
  height: 14mm;
  margin-bottom: 6mm;
}}
.header-line {{
  position: absolute;
  top: 4mm; left: 0;
  width: 55mm; height: 4px;
  background: linear-gradient(90deg, {brand} 0%, {BRAND_LIGHT} 70%, transparent 100%);
  border-radius: 2px;
}}
.header-accent {{
  position: absolute;
  top: 9mm; left: 0;
  width: 24mm; height: 2.5px;
  background: {brand};
  opacity: 0.85;
  border-radius: 1.5px;
}}
.header-logo {{
  position: absolute;
  top: 2mm; right: 0;
  width: {logo_w_mm}mm;
  height: {logo_h_mm}mm;
}}
.header-logo img {{
  width: 100%; height: 100%;
  display: block;
  object-fit: contain;
}}

/* ── Headings ── */
h1 {{
  font-size: 21.6pt; font-weight: 700; color: #1a1a1a;
  padding-bottom: 8px;
  margin-top: 0; margin-bottom: 0.7em;
  border-bottom: 3px solid {brand};
  page-break-after: avoid;
  line-height: 1.5;
}}
h2 {{
  font-size: 16.9pt; font-weight: 700; color: #1a1a1a;
  margin-top: 0.8em; margin-bottom: 0.4em;
  padding-left: 12px;
  border-left: 5px solid {brand};
  page-break-after: avoid;
  line-height: 1.4;
}}
h3 {{
  font-size: 14.2pt; font-weight: 600;
  color: {brand};
  margin-top: 0.5em; margin-bottom: 0.25em;
  page-break-after: avoid;
  line-height: 1.4;
}}
h4 {{
  font-size: 13pt; font-weight: 600;
  color: #1a1a1a;
  margin-top: 0.4em; margin-bottom: 0.2em;
  page-break-after: avoid;
}}

/* ── Paragraphs ── */
p {{
  margin-bottom: 0.7em;
  orphans: 3; widows: 3;
}}

/* ── Lists ── */
ul, ol {{
  margin-left: 4px; padding-left: 24px;
  margin-bottom: 0.7em;
}}
li {{
  margin-bottom: 4px;
  page-break-inside: avoid;
  line-height: 1.7;
}}
ul li::marker, ol li::marker {{ color: {brand}; }}
ol li::marker {{ font-weight: 600; }}

strong {{ color: #1a1a1a; font-weight: 700; }}

code {{
  background: #FFF0EB; color: {brand};
  padding: 1px 6px; border-radius: 3px;
  font-size: 12pt;
  font-family: "Consolas", "Courier New", monospace;
}}

hr {{
  border: none; height: 1.5px;
  background: linear-gradient(90deg, transparent 0%, {brand} 20%, {brand} 80%, transparent 100%);
  margin: 18px 0; opacity: 0.45;
}}

blockquote {{
  border-left: 5px solid {brand};
  background: linear-gradient(90deg, #FFF5F0 0%, #FFFAF7 100%);
  padding: 12px 18px; margin: 14px 0 18px 0;
  border-radius: 0 6px 6px 0;
  page-break-inside: avoid;
}}
blockquote p {{ margin-bottom: 0; color: #555; font-size: 12.2pt; }}

/* ── Table ── */
table {{
  width: 100%; border-collapse: collapse;
  margin: 12px 0 18px 0; font-size: 12pt;
  page-break-inside: avoid;
}}
th {{
  background: {brand}; color: white; font-weight: 600;
  padding: 8px 12px; text-align: left;
}}
td {{
  padding: 8px 12px;
  border-bottom: 1px solid #EEE;
  vertical-align: top; line-height: 1.85;
}}
tr:nth-child(even) td {{ background: {BRAND_BG_LIGHT}; }}
tr:last-child td {{ border-bottom: 3px solid {brand}; }}
"""


def make_html(md_content, logo_data_uri, css):
    md = markdown.Markdown(extensions=['tables', 'fenced_code', 'sane_lists'])
    html_body = md.convert(md_content)
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>{css}</style>
</head>
<body>
  <header class="page-header">
    <div class="header-line"></div>
    <div class="header-accent"></div>
    <div class="header-logo"><img src="{logo_data_uri}" alt="logo"></div>
  </header>
  <div class="content">
{html_body}
  </div>
</body>
</html>"""


def html_to_pdf(html_path, pdf_path):
    html_uri = html_path.as_uri()
    temp_pdf = TEMP_DIR / f'_edge_pdf_{uuid.uuid4().hex[:8]}.pdf'
    cmd = [
        EDGE_PATH,
        '--headless=new',
        '--disable-gpu',
        '--disable-extensions',
        '--no-pdf-header-footer',
        f'--print-to-pdf={temp_pdf}',
        html_uri,
    ]
    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=45,
                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        if not temp_pdf.exists():
            print('  [NO_PDF] Edge did not produce output')
            return False
        try:
            shutil.copy2(str(temp_pdf), str(pdf_path))
        except OSError:
            new_path = pdf_path.with_name(pdf_path.stem + '_new.pdf')
            shutil.copy2(str(temp_pdf), str(new_path))
            print(f'  [LOCKED] Saved as {new_path.name}')
        finally:
            try:
                temp_pdf.unlink()
            except OSError:
                pass
        return pdf_path.exists() or pdf_path.with_name(pdf_path.stem + '_new.pdf').exists()
    except subprocess.TimeoutExpired:
        print('  [TIMEOUT]')
        return False
    except Exception as e:
        print(f'  [ERROR] {e}')
        return False


def main():
    # 1. Load logo
    logo_uri, logo_w, logo_h = load_logo(LOGO_PATH, width_mm=36)
    css = build_css(logo_w, logo_h)

    # 2. Read markdown
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 3. Generate HTML
    html = make_html(md_content, logo_uri, css)
    html_path = TEMP_DIR / 'syllabus_zh_CN.html'
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'  HTML written: {html_path}')

    # 4. Generate PDF
    print(f'  Generating PDF...')
    if html_to_pdf(html_path, OUTPUT_PDF):
        size_kb = OUTPUT_PDF.stat().st_size / 1024
        print(f'  OK: {OUTPUT_PDF.name} ({size_kb:.1f} KB)')
    else:
        print('  FAILED')
        sys.exit(1)

    # 5. Cleanup
    if html_path.exists():
        html_path.unlink()

    print('\nDone!')


if __name__ == '__main__':
    main()
