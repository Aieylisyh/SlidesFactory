# tools — 工程工具（不部署到 COS）

本目录收纳 **不参与线上站点运行** 的脚本与预览工具。`deploy/sync.ps1` 已排除 `tools/**`。

## 子目录

| 路径 | 用途 |
|------|------|
| [`dev/`](dev/) | 本地 HTTP 预览（LAN / localhost）；[`new-deck-scaffold/`](dev/new-deck-scaffold/) 为新建 deck 最小示例页 |
| [`../新开项目工具/`](../新开项目工具/) | 工坊根目录复制脚本与说明（bat 位于此目录） |
| [`python/`](python/) | 图片压缩、PDF 抽图、CSS 分片 |
| [`design/`](design/) | Figma 对照 HTML / 脚本 |

## 常用命令

```bash
# 局域网预览（或双击根目录 start-lan-server.bat）
tools\dev\start-lan-server.bat

# 压缩 assets 大图
python tools/python/compress_web_assets.py

# 从 PDF 抽图
python tools/python/extract_pdf_images.py --pdf contents/<file>.pdf --out assets/pdf-extracted
```

规范详见 [`docs/guides/IMAGE_COMPRESSION_GUIDE.md`](../docs/guides/IMAGE_COMPRESSION_GUIDE.md)。
