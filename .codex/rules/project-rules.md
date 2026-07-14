# Codex 项目规则

## 工作入口

- 先读 `AGENTS.md`，再读本文件。
- 任务涉及主 deck 时先读 `config/outline.md`；涉及夏校时先读 `summerschool/outline.md`。
- 用户未明确要求时，不在 `quiz-live/` 做新功能开发；该目录已封存。

## 架构路由

| 改动类型 | 编辑位置 |
|----------|----------|
| 主 deck 结构 | `config/outline.md` + `index.html` |
| 夏校结构 | `summerschool/outline.md` + `summerschool/index.html` |
| 主 deck CSS | `styles/style-guide/*.css`，不要直接堆到 hub |
| 夏校 CSS | `summerschool/css/ss-*.css`，hub 是 `summerschool/style_extension.css` |
| 跨站点 JS | `shared/scripts/` |
| 主 deck 专用 JS | `scripts/` |
| 夏校专用 JS | `summerschool/scripts/` |
| 数据源 | 主 deck 看 `contents/data/` 与 `data/`；夏校看 `summerschool/data/` |

## Reveal deck 约束

- 项目使用线性横向导航；不要依赖垂直下钻作为观众主路径。
- 每个内容页主体使用 `.slide-content-layer`。
- 统一内容标题放在 `.slide-content-layer` 的第一个 `h2`，不要在 HTML 里手写标题字号。
- 复杂逻辑放 JS 模块；HTML 保持结构与内容，不塞大段 inline script。
- 互动区域只拦截 pointer 与必要键盘事件；不要拦截 `wheel`。
- 修改 CSS 或 JS 后递增对应 HTML 引用的 `?v=`。

## 资产与内容

- 不编造外部图片 URL；优先使用本地素材或明确占位。
- 新增或替换 JPEG/PNG/WebP 后，按 `docs/guides/IMAGE_COMPRESSION_GUIDE.md` 检查压缩。
- 从 PDF 抽图后运行 `tools/python/compress_web_assets.py`。
- 敏感部署配置只留在本地：`deploy/sync.env`、`deploy/quiz-live-relay.env`、`deploy/cos.yaml` 不提交。

## 夏校重点

- 夏校入口是 `summerschool/index.html`，结构源是 `summerschool/outline.md`。
- 夏校样式加载链：`../style_guide.css` + `style_extension.css` + `portrait-deck-adapt-extension.css`。
- 夏校 CSS 分片说明在 `summerschool/css/README.md`。
- 夏校共享 `shared/scripts/slide-progress.js`、`slide-wheel-nav.js`、`portrait-deck-adapt.js`；改共享脚本时检查主 deck 是否受影响。

## 验证

- 本地预览优先用根目录 `start-lan-server.bat`，访问 `http://localhost:8080/` 或 `/summerschool/`。
- 对 UI / 交互改动，至少检查桌面视口；涉及竖屏时检查手机竖屏和 `?portrait=0`。
- 部署前可用 `deploy/sync.bat -DryRun` 预览上传范围。
