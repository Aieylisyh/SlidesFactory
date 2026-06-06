# scripts — 主 deck 专用 JavaScript

仅 **主 deck**（`index.html`）引用。跨站点脚本见 [`shared/scripts/`](../shared/scripts/)。

## 目录结构

| 子目录 | 文件 | 职责 |
|--------|------|------|
| **`core/`** | `deck-viewport.js` | 视口尺寸、标题自适应、角标 logo |
| | `deck-nav.js` | 右下角导航簇 |
| | `deck-slide-host.js` | `slidechanged` 模块调度 |
| | `deck-reveal.js` | Reveal 初始化、resize、ready 后绑定 |
| | `main.js` | DOMContentLoaded boot |
| **`portfolio/`** | `grid-morph.js`, `surround-mesh-grid.js`, `portfolio-axis.js` | 作品集 mesh 与三轴 |
| **`cases/`** | `case-match.js`, `chat-lightbox.js`, `bilibili-embed.js` | 案例互动 |
| **`employment/`** | `salary-*.js`, `employment-hit-*.js`, `employment-quiz.js` | 就业与薪资 |
| **`chrome/`** | `slide-transitions.js`, `segment-arrow.js`, `share-lock.js`, `click-fx.js` | 转场、箭头、分享锁 |
| **`major/`** | `major-picker.js` | 专业方向选择 |

## 加载顺序

见 [`index.html`](../index.html) 底部 `<script>`：feature 模块 → `shared/scripts/*` → `core/*` → `main.js`。

修改后递增对应 `?v=` 参数。
