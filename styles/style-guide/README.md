# style-guide CSS 分片

主入口仍为项目根目录 **`style_guide.css`**（`@import` 聚合，HTML 只链这一条）。

| 文件 | 行数级 | 编辑场景 |
|------|--------|----------|
| `01-tokens-base.css` | ~330 | `:root` token、Reveal 基底、进度条、`.slide-content-layer`、标题默认色 |
| `02-layout-ui.css` | ~95 | `.accent-*`、封面/章节布局、`.sfk-table` |
| `03-portfolio.css` | ~930 | 作品集三页、环绕 mesh、`.portfolio-trust-*`、页角 logo / footer |
| `04a-content-header.css` | ~130 | 内容页 H2 标题带、议程列表 |
| `04b-case-gallery.css` | ~1090 | 案例卡、微信截图画廊、B 站 embed、QHD `@media` |
| `04c-case-match.css` | ~125 | 学员去向对对碰（`.match-chip*`） |
| `05a-employment.css` | ~1020 | 就业形势、商业现象双卡、小人互动、岗位/棱镜页 |
| `05b-major-closing.css` | ~180 | 专业方向 picker、结束页 |
| `06-transitions-salary.css` | ~865 | 转场 FX overlay、portfolio 三轴、薪资 toggle / ECharts |
| `07-mesh-lightbox.css` | ~170 | 成长性时间轴、聊天截图 lightbox、mesh 背景 slide 层级 |
| `08-segment-arrow-share.css` | ~650 | 分段箭头（`.segment-arrow-*`）、议程/成长性布局、`share-locked` |
| `09-deck-light-extension.css` | ~190 | 主 deck 浅色主题（`html.deck-light`） |
| `10-portrait-adapt.css` | ~270 | 竖屏通用覆盖（`html.deck-portrait`）、横屏提示条 |
| `11-quiz-live.css` | ~910 | **quiz-live 暖场自答**（`.ql-*`）；站点 hub `quiz-live/css/quiz-live.css` |

**夏校**独立 hub：[`summerschool/style_extension.css`](../../summerschool/style_extension.css) → `summerschool/css/ss-*.css`

## 快速检索

| 要找的类 / 模块 | 文件 |
|-----------------|------|
| `--sfk-magenta`、`--deck-progress-*` | `01-tokens-base.css` |
| `.reveal .progress`、`.deck-progress-thumb` | `01-tokens-base.css` |
| `.title-slide`、`.section-opener` | `02-layout-ui.css` |
| `.slide-portfolio-*`、`.surround-mesh-grid`（样式） | `03-portfolio.css` |
| `.content-slide` H2 标题带 | `04a-content-header.css` |
| `.case-card`、`.chat-shot`、`.bilibili-embed-*` | `04b-case-gallery.css` |
| `.match-chip`、`.match-game-panel` | `04c-case-match.css` |
| `.employment-hit-*`、`.employment-role-*` | `05a-employment.css` |
| `.major-pick-*`、`.slide-closing` | `05b-major-closing.css` |
| `.tx-fx-overlay`、`.salary-echarts-*` | `06-transitions-salary.css` |
| `.chat-lightbox-*`、`[data-surround-mesh-slide]` | `07-mesh-lightbox.css` |
| `.segment-arrow-*` | `08-segment-arrow-share.css` |
| `html.deck-light` 浅色覆盖 | `09-deck-light-extension.css` |
| `html.deck-portrait`、`.deck-portrait-hint` | `10-portrait-adapt.css` |
| `--ql-accent`、`.ql-category-btn`、`.ql-broadcast` | `11-quiz-live.css`（quiz-live 站点） |

## 维护

- 新增可复用类：写入**最合适**的分片 + 更新 [`docs/guides/style_guide_extended.md`](../docs/guides/style_guide_extended.md) + 本表。
- `04*` / `05*` 已手工分片；`split_style_guide_css.py` **不再**覆盖这些文件。
- 缓存：改任意分片后递增 `index.html` 中 `style_guide.css?v=`；夏校改 `summerschool/style_extension.css?v=`。
