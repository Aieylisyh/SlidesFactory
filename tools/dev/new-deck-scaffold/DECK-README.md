# 新演示 Deck

由 [`幻灯片生成工坊/Project/新开项目工具/`](../Project/新开项目工具/) 脚手架创建。本目录是**独立 Reveal.js 演示工程**，与参考课例 `Project/` 分离。

## 快速开始

1. **定结构** — 编辑 [`config/outline.md`](config/outline.md)（规范：[`docs/guides/OUTLINE_GUIDE.md`](docs/guides/OUTLINE_GUIDE.md)）
2. **放素材** — PDF / 图片 / 文稿放入 [`contents/`](contents/)
3. **改页面** — 按 outline 修改 [`index.html`](index.html)（标题、议程、`section id`）
4. **登记分享页** — [`config/share-pages.json`](config/share-pages.json)（见 [`docs/guides/SHARE_GUIDE.md`](docs/guides/SHARE_GUIDE.md)）
5. **预览** — 双击 [`start-lan-server.bat`](start-lan-server.bat)，浏览器打开 `http://localhost:8080/`（勿用 `file://`）

## 常用命令

```bat
REM 局域网预览（默认）
start-lan-server.bat

REM 仅本机
start-local-server.bat

REM PDF 抽图 + 压缩
python tools/python/extract_pdf_images.py --pdf contents/你的.pdf --out assets/pdf-extracted
python tools/python/compress_web_assets.py

REM 远程翻页导航 JSON（改 index.html 后）
node remoteNavigator/scripts/generate-deck-nav.js
```

## 工程约定

| 主题 | 位置 |
|------|------|
| 设计 token / CSS 分片 | [`style_guide.css`](style_guide.css) → [`styles/style-guide/`](styles/style-guide/) |
| 组件与交互脚本 | [`scripts/`](scripts/) · 跨站共享 [`shared/`](shared/) |
| Cursor 规则 | [`.cursorrules`](.cursorrules) |
| 文档索引 | [`docs/guides/README.md`](docs/guides/README.md) |

当前 `index.html` 为 **7 页最小示例**（标题 · 议程 · 两章各 opener+内容 · 收尾）。增删章节时同步更新 `config/outline.md` 与 `config/share-pages.json`。
