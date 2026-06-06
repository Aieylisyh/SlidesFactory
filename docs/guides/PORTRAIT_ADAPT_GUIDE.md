# Portrait adapt · 竖屏轻量适配

> 实现：`shared/scripts/portrait-deck-adapt.js` · 样式：`styles/style-guide/10-portrait-adapt.css`（经 `style_guide.css` hub 加载）  
> 策略：**A（scale-first）** — 保持 `main.js` 逻辑画布 1920×1080/1200，Reveal 整体缩放；竖屏仅加类名、通用 CSS 折叠与「横屏体验更佳」提示。  
> Agent skill：`.cursor/skills/portrait-deck-adapt/SKILL.md`

## 行为摘要

| 项 | 说明 |
|----|------|
| 检测 | `innerWidth / innerHeight < 0.95` → `html.deck-portrait` |
| 逻辑画布 | **不改** `getSlideDimensions()` |
| 提示 | 底部非模态条；「继续竖屏浏览」仅关本次；「不再提示」写 `sessionStorage` |
| 禁用 | URL `?portrait=0` 强制桌面样式 |
| 事件 | `deckportraitchange`（`detail.portrait`）→ `Reveal.layout()` + 窗口 `resize`（ECharts 等） |
| 滚轮翻页 | 竖屏时 `SlideWheelNav` 通过 `ignoreWhen` 跳过 |

## 接入清单

```
- [ ] <meta name="viewport" … viewport-fit=cover>
- [ ] style_guide.css（含 10-portrait-adapt.css）
- [ ] shared/scripts/portrait-deck-adapt.js 在 main.js 之前
- [ ] main.js：boot 内 PortraitDeckAdapt.init()；initialize().then 内 bind(Reveal)
- [ ] SlideWheelNav.bind({ ignoreWhen: PortraitDeckAdapt.isPortrait })
- [ ] 改 JS/CSS 后 bump ?v= on index.html
```

## API

```javascript
PortraitDeckAdapt.init(options?)   // 尽早调用（main.js boot）
PortraitDeckAdapt.bind(Reveal)     // Reveal.initialize().then
PortraitDeckAdapt.isPortrait()     // 只读
PortraitDeckAdapt.dismissHint()    // 程序化关闭并「不再提示」
PortraitDeckAdapt.update()         // 手动刷新检测
```

### 配置项（`init({ … })`）

| 字段 | 默认 | 说明 |
|------|------|------|
| `aspectMax` | `0.95` | 宽高比低于此值视为竖屏 |
| `hintStorageKey` | `sfk-deck-portrait-hint-dismissed` | sessionStorage |
| `hintDelayMs` | `400` | 首屏布局后再显示提示 |
| `debounceMs` | `120` | 与 main.js resize 对齐 |
| `queryDisable` | `portrait` | 查询参数名 |
| `disableValue` | `0` | `?portrait=0` |

## CSS 扩展

- 全局竖屏覆盖写在 **`styles/style-guide/10-portrait-adapt.css`**（`html.deck-portrait`）。
- 单页特例：在 slide 上加 `data-portrait-layout="stack"` 等，再在 `10-portrait-adapt.css` 用属性选择器扩展（可选）。
- 冻结模块（如往届案例 HTML）**不必改**；通用折叠选择器自动生效。

## 与方案 B 的关系

若将来竖屏改用 **1080×1920** 逻辑画布，在 `getSlideDimensions()` 增加分支，并将 `PortraitDeckAdapt` 配置扩展为 `mode: 'scale' | 'reflow'`（默认 `'scale'`）。当前仓库未启用 B。

## Summerschool 子站（已接入）

路径：`summerschool/` · 浅色主题 `html.ss-deck-light`

| 文件 | 说明 |
|------|------|
| `../style_guide.css` | 含 `10-portrait-adapt.css` |
| `../shared/scripts/portrait-deck-adapt.js` | 与主 deck 共用 |
| `summerschool/portrait-deck-adapt-extension.css` | 橙白提示条、课表/场地/小贴士等折叠 |

`main.js`：`PortraitDeckAdapt.init()` / `bind(Reveal)`；`SlideWheelNav.ignoreWhen` 同时尊重竖屏与 `is-ss-schedule-modal-open`。

预览：根目录 `start-lan-server.bat` → `http://localhost:8080/summerschool/`（或子目录 `start-local-server.bat`）。

## 移植到其他 deck

1. 引用 `shared/scripts/portrait-deck-adapt.js` + `style_guide.css`（或单独 `@import` `10-portrait-adapt.css`）
2. 按上表接入 `index.html` + `main.js`
3. 浅色/特殊布局：新增 `{deck}/portrait-deck-adapt-extension.css`
4. 按目标 deck 的 grid 类名增补 extension 或 `10-portrait-adapt.css` 选择器
5. 阅读 `.cursor/skills/portrait-deck-adapt/SKILL.md`

## 调试

1. Chrome DevTools → 设备模式 → 竖屏宽高比
2. `?portrait=0` 对比桌面折叠是否关闭
3. 清除提示：`sessionStorage.removeItem('sfk-deck-portrait-hint-dismissed')`
4. 本地预览用 `start-lan-server.bat`，勿用 `file://`

## 限制（预期）

- 缩放后字号仍可能偏小；提示横屏是产品预期。
- 极特殊版式可能需 `data-portrait-*` 或额外 CSS。
- 微信内置浏览器以 `innerWidth/innerHeight` 为准，勿单独依赖 `orientation` API。
