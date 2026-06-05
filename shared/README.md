# Shared — 跨站点 JavaScript

被 **主 deck**（`index.html`）与 **夏校**（`summerschool/index.html`）共同引用的脚本。

| 文件 | 全局 API | 规范文档 |
|------|----------|----------|
| `slide-progress.js` | `SlideProgress` | [`guides/style_guide.md`](../guides/style_guide.md) §4.5 · `.cursor/skills/deck-progress-bar/` |
| `slide-wheel-nav.js` | `SlideWheelNav` | [`guides/WHEEL_NAV_GUIDE.md`](../guides/WHEEL_NAV_GUIDE.md) |
| `portrait-deck-adapt.js` | `PortraitDeckAdapt` | [`guides/PORTRAIT_ADAPT_GUIDE.md`](../guides/PORTRAIT_ADAPT_GUIDE.md) · `.cursor/skills/portrait-deck-adapt/` |
| `deck-focus-nav.js` | `DeckFocusNav` | [`guides/REMOTE_FOCUS_MAP.md`](../guides/REMOTE_FOCUS_MAP.md) — 由 `presenter-bridge.js` 注入 iframe |

## 引用路径

| 站点 | 前缀 |
|------|------|
| 主 deck | `shared/scripts/…` |
| 夏校 | `../shared/scripts/…` |

修改后请在各站点 HTML 中递增对应 `?v=` 参数。

主 deck 专用脚本仍在仓库根 `scripts/`，不在此目录。
