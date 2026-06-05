# style-guide CSS 分片

主入口仍为项目根目录 **`style_guide.css`**（`@import` 聚合，HTML 只链这一条）。

| 文件 | 行数级 | 编辑场景 |
|------|--------|----------|
| `01-tokens-base.css` | ~330 | `:root` token、Reveal 基底、进度条、`.slide-content-layer`、标题默认色 |
| `02-layout-ui.css` | ~95 | `.accent-*`、封面/章节布局、`.sfk-table` |
| `03-portfolio.css` | ~930 | 作品集三页、环绕 mesh、`.portfolio-trust-*`、页角 logo / footer |
| `04-cases-interactive.css` | ~1300 | 内容页 H2 标题带、案例卡、微信截图画廊、配对游戏、QHD `@media` |
| `05-employment-major.css` | ~1185 | 就业形势、黑神话/哪吒双卡、小人互动、专业方向 picker、结束页 |
| `06-transitions-salary.css` | ~865 | 转场 FX overlay、portfolio 三轴、薪资 toggle / ECharts |
| `07-mesh-lightbox.css` | ~170 | 成长性时间轴、聊天截图 lightbox、mesh 背景 slide 层级 |
| `08-segment-arrow-share.css` | ~650 | 分段箭头（`.segment-arrow-*`）、议程/成长性布局、`share-locked` |
| `09-deck-light-extension.css` | ~190 | 主 deck 浅色主题（`html.deck-light`） |
| `10-portrait-adapt.css` | ~270 | 竖屏通用覆盖（`html.deck-portrait`）、横屏提示条 |

## 快速检索

| 要找的类 / 模块 | 文件 |
|-----------------|------|
| `--sfk-magenta`、`--deck-progress-*` | `01-tokens-base.css` |
| `.reveal .progress`、`.deck-progress-thumb` | `01-tokens-base.css` |
| `.title-slide`、`.section-opener` | `02-layout-ui.css` |
| `.slide-portfolio-*`、`.surround-mesh-grid`（样式） | `03-portfolio.css` |
| `.case-card`、`.case-match`、`.chat-shot` | `04-cases-interactive.css` |
| `.employment-hit-*`、`.major-pick-*` | `05-employment-major.css` |
| `.tx-fx-overlay`、`.salary-echarts-*` | `06-transitions-salary.css` |
| `.chat-lightbox-*`、`[data-surround-mesh-slide]` | `07-mesh-lightbox.css` |
| `.segment-arrow-*` | `08-segment-arrow-share.css` |
| `html.deck-light` 浅色覆盖 | `09-deck-light-extension.css` |
| `html.deck-portrait`、`.deck-portrait-hint` | `10-portrait-adapt.css` |

## 维护

- 新增可复用类：写入**最合适**的分片 + 更新 [`guides/style_guide_extended.md`](../guides/style_guide_extended.md) + 本表（若跨模块则放 `02` 或对应模块文件）。
- 重新切分：运行 `python scripts/split_style_guide_css.py`（会**覆盖**分片并重写 hub；先改 monolith 备份或只改分片后勿盲目重跑）。
- 缓存：改任意分片后递增 `index.html` 中 `style_guide.css?v=`。
