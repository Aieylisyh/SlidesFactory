# Wheel navigation · 滚轮翻页

> 实现：`shared/scripts/slide-wheel-nav.js` · 在 `Reveal.initialize()` 之后由 `scripts/core/deck-reveal.js` 调用 `SlideWheelNav.bind()`。

## 行为

- 监听：`document.documentElement`，`capture: true`，`passive: false`。
- 仅当事件目标在 `.reveal` 内时处理。
- 忽略：Reveal 未就绪、横向滚动为主（`|deltaX| > |deltaY|`）、灯箱打开（`body.is-chat-lightbox-open`）、翻页冷却中。
- **双 tick**：同向累积 `|deltaY|` 超过 `stepThreshold`（35）算 1 tick；1 秒窗口内第 2 个 tick 才 `Reveal.next()` / `prev()`；翻页后冷却 550ms。

## 调参（`shared/scripts/slide-wheel-nav.js` 顶部 `DEFAULTS`）

| 字段 | 默认 | 说明 |
|------|------|------|
| `stepThreshold` | 35 | 单次有效滚动灵敏度 |
| `windowMs` | 1000 | 两次 tick 最大间隔 |
| `cooldownMs` | 550 | 翻页后锁定 |
| `ticksRequired` | 2 | 触发翻页所需 tick 数 |

## 互动区约定（CRITICAL）

在 `.interactive-zone`、游戏、canvas 上：

- **可以**拦截：`mousedown`、`mouseup`、`click`、`touchstart`、`touchend`、`keydown`（Space / 方向键 / PageUp / PageDown）。
- **禁止**拦截：`wheel` — 会阻断本模块的捕获阶段翻页（见第 6 / 27 / 30 页历史问题）。

点击 `button` 后建议在逻辑末尾 `blur()`，避免焦点滞留。

## 调试

1. 确认 `slide-wheel-nav.js` 在 `main.js` 之前加载。
2. 硬刷新 `?v=` 缓存。
3. 在互动区点击后于面板内外各试一次滚轮。
4. 灯箱打开时应不翻页。
