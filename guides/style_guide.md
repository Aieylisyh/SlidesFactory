# Presentation Design System & Style Guide

> 斯芬克游戏动画科系 · Reveal.js 演示规范  
> **CSS 入口**：`style_guide.css`（`@import` 聚合，HTML 只引用此文件）  
> **CSS 分片**：`styles/style-guide/*.css`（见下文 §CSS Architecture）  
> **文档索引**：[`guides/README.md`](README.md) · [`docs/README.md`](../docs/README.md)
> **组件索引**：`style_guide_extended.md`  
> **转场规则**：`transition_guide.md`

---

## 1. Brand Identity

- **Brand**：SFK International Art Education（斯芬克）· 游戏动画科系  
- **Logo 参考**：黑底 + 品红主标「SFK」+ 白字副标 + 右上角圆形印章（RETHINK IT）  
- **Tone**：专业、艺术、科技；**高对比 Dark Mode**——纯黑底、白字、品红点缀；动效克制  
- **Theme**：严格 Dark Mode，背景 `#000000`（与 logo 一致）

### 1.1 Logo 视觉拆解

| 元素 | 特征 | 设计映射 |
|------|------|----------|
| SFK 主字母 | 超粗几何无衬线、品红填充 | 标题 `font-weight: 800`；主强调色 `--sfk-magenta` |
| 英文 / 中文副标 | 白字、中等字重、清晰间距 | `--text-main`；页脚 `.brand-footer` 字间距 |
| 背景 | 纯黑 `#000000` | `--bg-color`、slide 背景 |
| 印章圆环 | 同色系、略深、半透明 | `--sfk-magenta-dark`；面板边框用 rgba 通道变量 |
| **无橙色** | Logo 不含橙红 | 原 `--sfk-orange` 改为 `--sfk-magenta-light`（同色相浅 tint，用于双栏对比） |

### 1.2 页角 Logo（每页右上角）

- **资源**：`assets/logos/DMA-logo-black.png`（SFK × DMA 联合标识，白底转黑版；原 `DMA logo.png` 保留备查）  
- **注入**：`scripts/main.js` → `injectSlideBrandLogos()` 为每个**叶子** `section`（无 nested 子页的栈父级）自动插入，无需手写 HTML  
- **结构**：`<div class="slide-brand-logo" aria-hidden="true"><img src="assets/logos/DMA-logo-black.png" alt=""></div>`，作为 `section` 直接子元素，DOM 顺序置于最前  
- **位置**：Logo **右上角**贴齐幻灯片画布 **右上角** — `top: 0`、`right: 0`（不受内容安全区内边距影响）  
- **尺寸**：`max-width: 180px`（token `--slide-brand-logo-max-width`），高度等比缩放  
- **层级**：`z-index: 1` — 压在幻灯片背景 / Canvas（0）之上，低于 `.slide-content-layer`（2）与 `.brand-footer`（3）  
- **交互**：`pointer-events: none`，不阻挡点击、游戏与互动区

---

## 2. Color Palette

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg-color` | `#000000` | 页面背景（logo 黑底） |
| `--panel-bg` | `#111111` | 卡片、面板 |
| `--text-main` | `#FFFFFF` | 标题、核心结论 |
| `--text-muted` | `#B3B3B3` | 正文、次要说明 |
| `--sfk-magenta` | `#C82464` | **主品牌色** — SFK 字母填充；表头、下划线、标签 |
| `--sfk-magenta-light` | `#E05688` | **次级强调** — 双栏右栏 / 路径 B（替代旧橙色） |
| `--sfk-magenta-mid` | `#D43272` | 渐变中间色（转场幕帘等） |
| `--sfk-magenta-dark` | `#961848` | 印章深度、暗部 tint |
| `--sfk-pink` | `var(--sfk-magenta)` | 语义别名，配合 `.accent-pink` |
| `--sfk-orange` | `var(--sfk-magenta-light)` | 语义别名，配合 `.accent-orange`（**非橙色**） |
| `--sfk-cyan` / `--sfk-teal` | `#00D4FF` / `#00C896` | 仅作品集「热点」页模块 accent，非主品牌 |
| `--deck-progress-height` / `--deck-progress-height-active` | `5px` / `12px` | 底部全 deck 进度条静息 / 悬停高度 |
| `--deck-progress-track-width` | `min(96vw, 1840px)` | 进度条可视轨道宽度（居中） |
| `--deck-progress-hit` | `40px` | 可拖拽点击的热区高度 |
| `--deck-progress-opacity-idle` / `-active` | `0.45` / `1` | 整条进度条静息 / 悬停·拖拽不透明度 |
| `--deck-progress-bar-edge` | `#3a3a3a` | **Bar 渐变** — 轨道两端固定深灰 |
| `--deck-progress-bar-mid` | `#5c3548` | **Bar 渐变** — S 两侧过渡（深灰 → 品红桥接） |
| `--deck-progress-bar-peak` | `#f084a8` | **Bar 渐变** — S 处主题品红峰，略亮于 S thumb（`--sfk-magenta-light`） |
| `--deck-progress-bar-spread` | `16%` | **Bar 渐变** — S 向左右扩散半宽（相对整条轨道） |
| `--deck-progress-thumb-pct` | `0%` → `100%` | S 水平位置；驱动 bar 渐变峰位（`slide-progress.js` 写入 `.progress`） |
| `--deck-progress-thumb-h` / `-active` | `32px` / `41px` | S 标记高度（静息 / 悬停·拖拽） |
| `--deck-progress-thumb-aspect` | `187 / 257` | S 标记宽高比（`assets/logos/S.png` 原图） |
| `--deck-progress-thumb-spin` | `0deg` → `1080deg` | 随进度顺时针旋转（`slide-progress.js` 写入） |
| `--deck-progress-thumb-origin-x/y` | `50%` / `50%` | S 旋转 pivot；偏了可微调 |
| `--deck-progress-thumb-offset-y` | `calc(10px + thumb-h × aspect × 0.8 − thumb-h)` | 光学垂直微调（含上移 1×S 图高） |
| `--deck-progress-s-mask` | `url("assets/logos/S.png")` | S 形状蒙版；背景用品红渐变 tint |

**RGB 通道变量**（Canvas / 半透明边框）：`--sfk-magenta-r/g/b`、`--sfk-magenta-light-r/g/b`

**强调用法**

- 句内关键词：`<span class="accent-pink">` / `<span class="accent-orange">`  
- 避免整段染成品牌色；一行 slide 上 pink + orange 各 1–2 处即可  
- **禁止**再使用旧色 `#E4004F`、`#FF5000` 或纯橙 `#FF5000` 作为品牌强调

---

## 3. Typography

**Font stack**：`'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif`（见 `--font-sans`）

| 层级 | 类 / 元素 | 字号（相对 Reveal root） | 颜色 |
|------|-----------|---------------------------|------|
| 封面 H1 | `.title-slide h1` | `2.4em` | main |
| 封面副标题 | `.subtitle` | `0.42em` | muted + 品红顶线 |
| 内容页 H2 | `.content-slide` 首个 `h2` / `.slide-page-header` | `3.5em` 上限，**70% 宽 + 标题区高自适应** + **3px 品红下划线** | main |
| 章节开篇 H2 | `.section-opener h2` | 居中 + 下划线 | main |
| 核心结论 | `.case-highlight` | `0.85em` | **main（白）** |
| 次要说明 | `.case-body-sm` | `0.62em` | muted |
| 正文 | `p`, `li` | 默认 | muted，`line-height: 1.6` |
| 页脚品牌 | `.brand-footer` | `0.5em` | magenta，字间距 2px |

**排版原则**

- Slide 上只放**可扫读**的短句、标签、图；长逻辑进 `<aside class="notes">`  
- 标题左对齐（`.content-slide`）；仅封面、章节开篇居中  
- 中文标题**不用**英文全大写 `text-transform`

---

## 4. Layout & Spacing

### 4.1 画布与安全区

- 逻辑分辨率（`main.js` 自动）：16:9 → **1920×1080**；16:10 → **1920×1200**  
- 内容安全区：`.slide-content-layer` 默认 `padding: 32px 48px 40px`  
- 每页必须包一层 `.slide-content-layer`；**不要**在 `section` 上写 inline style

### 4.2 常用布局

| 类名 | 结构 |
|------|------|
| `.slide-layout-split` | 双栏 1:1，`gap: 32px` |
| `.slide-layout-split-wide-right` | 左 0.9 / 右 1.1（文字左、媒体右） |
| `.slide-layout-split-wide-left` | 左 1.1 / 右 0.9（截图左、文字右） |
| `.slide-wechat-board` | 标题 +  flex 居中画廊，专用于微信截图页 |
| `.slide-image-full` | 单图 hero，几乎占满安全区 |

### 4.3 章节与导航

- **线性演示**：`navigationMode: 'linear'`，禁用 ↑↓ 竖向键  
- HTML 可用 nested `section` **分组**，观众仍水平翻页  
- 竖向箭头 UI 隐藏  
- **右下角翻页条**：Reveal 左/右箭头 + 页码 `c/t` 组合为 `← 页码 →`，页码居中夹在两箭头之间

| 规则 | 实现 |
|------|------|
| 布局 | `main.js` → `bindDeckNavCluster()` 将 `.slide-number` 移入 `.controls` 内的 `.deck-nav-cluster` flex 容器 |
| 箭头 | Reveal 默认 `.controls-arrow` 样式不变；按钮 `position: static` 参与 flex 排列 |
| 页码 | 居中、`min-width: calc(var(--reveal-nav-arrow) * 1.15)`、半透明黑底 |
| 整体偏移 | `.reveal .controls` 保留 `transform: translate(-2×arrow, -1×arrow)` 避让底部进度条 |
| 启用 | `Reveal.initialize({ slideNumber: 'c/t' })` + init 后调用 `bindDeckNavCluster()` |

**实现分工**

| 层 | 文件 | 职责 |
|----|------|------|
| 样式 / token | `01-tokens-base.css` — `.deck-nav-cluster`、`:root --reveal-nav-arrow` | flex 排列、页码样式 |
| 运行时 | `scripts/main.js` | `bindDeckNavCluster()` DOM 重组（左箭头 · 页码 · 右箭头） |

### 4.4 内容页标题区（与 Logo 对齐）

有标题的内容页（非封面、议程、章节开篇、致谢）统一使用 **标题区规范**，与右上角 Logo（`§1.2`）形成固定视觉关系：

| 规则 | 实现 |
|------|------|
| Logo | 右上角贴齐画布，`max-width: 180px`（`main.js` 自动注入） |
| 标题对齐 | 左上角，位于 `.slide-content-layer` 内首个 `h2`（或包在 `.slide-page-header` 内） |
| 标题区高度 | `--slide-title-zone-height`：品红下划线落在页眉带底边略下方（≈ `--slide-brand-logo-layout-height` − 上内边距 + **6px**）；横版 Logo 时用 `max(实际显示高, 180×0.537)` 保底，避免标题区被压扁 |
| 标题最大宽度 | **70%** 内容区宽（`--slide-title-max-width`） |
| 字号 | 上限 `3.5em`（`--slide-title-font-max`），`main.js` → `fitSlidePageTitles()` 按 **70% 宽** 与 **标题区可用高度** 二分取最大字号（下限 `0.72em`），结果写入 `--slide-title-fit-size`（px） |
| 品红下划线 | `3px` 线宽 + `8px` 字线间距（`--slide-title-underline-width` / `--slide-title-underline-gap`），文字不得与下划线重叠 |
| 行高 | `--slide-title-line-height: 1.08`（单行尽量撑满标题区高度） |
| 标题下留白 | `margin-bottom: 28px`（`--slide-title-margin-bottom`） |

**实现分工（无独立标题脚本）**

| 层 | 文件 | 职责 |
|----|------|------|
| 样式 / token | `01-tokens-base.css` `:root` + `04-cases-interactive.css` `.content-slide … h2` | 标题区尺寸、下划线、70% 宽、`--slide-title-fit-size` 回退 |
| 运行时 | `scripts/main.js` | `injectSlideBrandLogos()` · `fitSlidePageTitle()` / `fitSlidePageTitles()` |
| 触发时机 | 同上 | Reveal 初始化后、`window.resize`（debounce）、`slidechanged` |

**`fitSlidePageTitles()` 适配规则**

1. **作用元素**：`.content-slide` 内 `.slide-content-layer > h2:first-child`，或 `.slide-page-header > h2`（`isUnifiedTitleH2()` 校验）。
2. **宽度约束**：`scrollWidth ≤ layer.clientWidth × 0.7`（单行优先，放不下再换行，最多 2 行 `-webkit-line-clamp: 2`）。
3. **高度约束**：`scrollHeight ≤ zoneH − borderBottomWidth`。**注意**：`scrollHeight` 已含 `padding-bottom`（字线间距），不要再减 `--slide-title-underline-gap`，否则会误判溢出或把字号压过小。
4. **搜索上界**：`max( token 上限 em 换算 px , 可用文字高度 ÷ line-height )`，避免 `--slide-title-font-max` 过低时短标题无法撑满标题区（历史问题：曾用 `1.6em` 作硬顶导致标题偏小）。
5. **离屏页**：`layer.clientWidth === 0` 时跳过；翻到该页时由 `slidechanged` 重新适配。
6. **输出**：适配结果一律写 `--slide-title-fit-size: Npx`；勿依赖 CSS 回退的 `3.5em`（长标题会撑破 70% 宽）。

**调参经验（标题偏小 / 溢出）**

| 现象 | 优先检查 |
|------|----------|
| 短标题明显偏小 | 提高 `--slide-title-font-max`；确认 JS 上界含「按高度推算」而非仅 token |
| 长标题压红线 | 减小 `--slide-title-underline-gap` 或略增 `--slide-title-zone-height`；勿删 JS 高度校验 |
| 某页未适配 | 是否误用 `.section-opener`；或 `h2` 不是 layer 下第一个子元素 |
| 改 CSS/JS 后无变化 | 递增 `index.html` 中 `style_guide.css` / `main.js` 的 `?v=` 并硬刷新 |

**相关 CSS token（`:root`）**

| Token | 当前值 | 说明 |
|-------|--------|------|
| `--slide-title-font-max` | `3.5em` | JS 搜索上界之一；应足够大，实际字号由 JS 收敛 |
| `--slide-title-font-min` | `0.72em` | 搜索下界 |
| `--slide-title-max-width` | `70%` | 与 JS `× 0.7` 一致 |
| `--slide-brand-logo-layout-height` | `max(显示高, 180×0.537)` | 页眉带参考高；横版联合 Logo 不压低标题区 |
| `--slide-title-zone-height` | `calc(layout高 − padding-y + 6px)` | 含下划线间距与 3px 线 |
| `--slide-title-underline-gap` | `8px` | 字底到下划线，防重叠 |
| `--slide-title-line-height` | `1.08` | 影响单行可放大上限 |

**例外（不走统一标题区）**：`.title-slide`、`.slide-agenda`、`.section-opener`、`.slide-closing`。

**HTML 推荐**（可选显式包裹）：

```html
<div class="slide-content-layer">
  <header class="slide-page-header"><h2>页面标题</h2></header>
  <!-- 正文 -->
</div>
```

无包裹时，`.slide-content-layer` 下**第一个** `h2` 自动套用同一套样式与字号适配。

### 4.5 全 deck 底部进度条

Reveal 内置 `.progress` 轨道 + 独立模块 `shared/scripts/slide-progress.js`（`SlideProgress.init(Reveal)`，在 `main.js` 初始化后调用）。**本 deck 始终启用进度条**（`progress: true`），并**常驻**以下两项视觉：

1. **Bar 渐变轨道** — 以 S 为中心、向左右对称的灰阶渐变（见下节）  
2. **S 位置标记** — `assets/logos/S.png` 蒙版 + 品牌品红渐变 tint

勿改回 Reveal 默认「左→右纯色填充」或按已播/未播分色；Reveal 自带填充 `span` 仅保留宽度逻辑，**背景须透明**，视觉完全由 `.progress` 上的 bar 渐变承担。

#### Bar 渐变（常驻规范）

| 规则 | 实现 |
|------|------|
| 峰位 | 与 S 水平对齐；`--deck-progress-thumb-pct` 由 `slide-progress.js` 在 `progress` / `slidechanged` 时写入 `.progress` |
| 色阶（左→右） | `--deck-progress-bar-edge`（深灰）→ `--deck-progress-bar-mid`（暗品红过渡）→ `--deck-progress-bar-peak`（S 处略亮主题品红）→ `mid` → `edge` |
| 对称性 | 以 S 为轴左右对称；**两端 0% / 100% 固定深灰**，不随进度改变 |
| 扩散 | `--deck-progress-bar-spread` 控制峰两侧过渡宽度（默认 `16%` 轨道宽） |
| CSS | `.reveal .progress` 上 `linear-gradient(90deg, …)`，停止点用 `calc(var(--deck-progress-thumb-pct) ± spread)` |
| 禁止 | 纯色轨道底、已播/未播双色条、在填充 `span` 上再叠第二层 bar 色 |

#### 交互与其它规则

| 规则 | 实现 |
|------|------|
| 当前位置标记 | `assets/logos/S.png` 作 `mask-image`，背景品红渐变 tint（`.deck-progress-thumb`） |
| S 尺寸 / 形状 | `--deck-progress-thumb-h` + `--deck-progress-thumb-aspect`；勿拉伸变形 |
| 垂直对齐 | thumb 为 `.progress` 直接子元素，`top: 50%` + `translate(-50%, -50%)`，相对轨道居中 |
| 静息 / 展开 | 轨道 `5px` → 悬停底部 52px 内或指针在条上时 `12px`（`.is-deck-progress-active`）；bar 渐变与 S 行为不变，仅高度与 `--deck-progress-opacity-*` 变化 |
| 拖拽翻页 | 按下 `.progress` 左右拖动；**拖拽中仅视觉跟随**（见下节）；`stopPropagation` 防误触导航 |
| 样式入口 | `01-tokens-base.css` — `.reveal .progress`、`.deck-progress-thumb`、`.is-deck-progress-active`、`.is-dragging`、`.is-snapping` |

#### 拖拽与释放吸附（v8+）

| 阶段 | 行为 | 实现 |
|------|------|------|
| 按下 | 取消进行中的 snap；`.progress` 加 `.is-dragging`；`setPeek(true)` | `onPointerDown` → `cancelSnap()` |
| 拖拽中 | S 与 bar 渐变峰位**平滑跟随指针**；**不调用** `Reveal.slide()` | `setThumbFraction(fractionFromClientX(clientX))`；`syncThumbPosition()` 在 `dragging \|\| snapping` 时跳过 |
| 释放 | 移除 `.is-dragging`；`.progress` 加 `.is-snapping` | `onUp` → `snapToNearestSlide(releaseFraction)` |
| 吸附动画 | thumb 从释放位置 easeOutCubic 插值到最近 slide 分数；**~220ms**（`SNAP_DURATION_MS`） | `snapToNearestSlide` + `requestAnimationFrame` |
| 吸附完成 | 移除 `.is-snapping`；`Reveal.slide(h, v)` 跳转；`syncThumbPosition()` | `nearestSlideIndex` → `slideFractionForIndex` → `Reveal.getIndices` |

**关键函数**（`shared/scripts/slide-progress.js` v8+）

| 函数 | 职责 |
|------|------|
| `setThumbFraction(fraction)` | 写入 thumb `left`、`--deck-progress-thumb-pct`（bar 峰位）、`--deck-progress-thumb-spin` |
| `nearestSlideIndex(fraction, total)` | 遍历 slide 分数，返回距离最近的 leaf index |
| `snapToNearestSlide(fromFraction, onDone)` | rAF 动画 + 完成后 `Reveal.slide()`；期间 `snapping = true` 阻止外部 sync |

**CSS 状态类**

| 类 | 挂载元素 | 效果 |
|----|----------|------|
| `.is-dragging` | `.progress` | 轨道展开、thumb 放大、`cursor: grabbing` |
| `.is-snapping` | `.progress` | 与 dragging 同视觉展开；thumb 尺寸 transition `0.22s ease`（与 snap 时长对齐） |

**实现分工**

| 层 | 文件 | 职责 |
|----|------|------|
| Bar 渐变 / token | `01-tokens-base.css` `:root` + `.reveal .progress` | `--deck-progress-bar-*` 色阶与 `linear-gradient`；填充 `span` 透明 |
| S thumb 样式 | `01-tokens-base.css` `.deck-progress-thumb` | 尺寸、蒙版、品红 tint、光晕 |
| 运行时 | `shared/scripts/slide-progress.js`（**v8+**） | 注入 thumb；同步 `left` 与 `--deck-progress-thumb-pct`（**bar 渐变峰位**）；悬停展开；拖拽平滑跟随 + 释放吸附 snap |
| 启用 | `scripts/main.js` | `Reveal.initialize({ progress: true })` + `SlideProgress.init(Reveal)` |
| 形状 | `assets/logos/S.png` + `--deck-progress-s-mask` | 白形蒙版 + CSS 渐变着色 |

**调参**

| 现象 | 处理 |
|------|------|
| S 太小 / 太大 | 调整 `--deck-progress-thumb-h` / `-active` |
| S 被压扁 / 形状不对 | 保持 `--deck-progress-thumb-aspect: 187 / 257`；换图后同步更新 |
| S 偏高 | 增大 `--deck-progress-thumb-offset-y` |
| S 偏下 | 减小 `--deck-progress-thumb-offset-y` |
| 两端不够深 / 太黑 | 调整 `--deck-progress-bar-edge` |
| S 处不够亮 / 太亮 | 调整 `--deck-progress-bar-peak`（须略亮于 `--sfk-magenta-light`）；过渡带调 `--deck-progress-bar-mid` |
| 扩散太宽 / 太窄 | 调整 `--deck-progress-bar-spread` |
| 整条偏淡 / 偏实 | 调整 `--deck-progress-opacity-idle` / `-active` |
| bar 渐变不跟 S 走 | 确认 `shared/scripts/slide-progress.js` 向 `.progress` 写入 `--deck-progress-thumb-pct` |
| 改 JS/CSS 无效 | 递增 HTML 中 `shared/scripts/slide-progress.js` / `style_guide.css` 的 `?v=` |

### 4.6 竖屏轻量适配（策略 A）

手机竖屏 **不改变** `main.js` 逻辑画布（仍为 1920×1080/1200 + Reveal 缩放）。独立模块负责检测、提示与排版折叠。

| 规则 | 实现 |
|------|------|
| 策略 | **A scale-first** — 见 `PORTRAIT_ADAPT_GUIDE.md` |
| 检测 | `shared/scripts/portrait-deck-adapt.js` → `html.deck-portrait`（宽高比 &lt; 0.95） |
| 样式 | `styles/style-guide/10-portrait-adapt.css`（经 `style_guide.css` hub 加载） |
| 横屏提示 | 底部条「横屏体验更佳」；`sessionStorage` 记住「不再提示」 |
| 禁用竖屏模式 | URL `?portrait=0` |
| 滚轮翻页 | 竖屏时 `SlideWheelNav` `ignoreWhen` → `PortraitDeckAdapt.isPortrait()` |
| Agent skill | `.cursor/skills/portrait-deck-adapt/SKILL.md` |

**勿**在策略 A 下修改 `getSlideDimensions()` 为 1080×1920（属方案 B，未默认启用）。

---

## 5. Images & Media

### 5.1 容器

- 统一 `.tech-image-container`：**0 圆角**、2px `#333` 边框、黑底  
- **禁止** fake URL；无本地图时用 `.image-placeholder` 灰底 + 描述文字

### 5.2 展示模式（必选其一）

| 类 | 行为 | 适用 |
|----|------|------|
| `.fit-shot` / `.fit-shot-large` | `object-fit: contain`，限 max-height | 项目渲染、游戏截图 |
| `.chat-shot` | contain，尽量放大 | **微信 / 聊天截图（默认不裁剪）** |
| `.chat-shot-trim-x` | 左右各裁约 **4%** | 截图两侧留白过多时 |
| `.fit-shot-hero` | 大图居中 | PDF 整页导出图 |
| `.compact` | cover，max 300px | 缩略图 |

### 5.3 网格约定

| 张数 | 类名 |
|------|------|
| 2 | `.image-grid-duo` 或 `.wechat-gallery`（2 列） |
| 3 | `.wechat-gallery-trio` |
| 4+ | `.wechat-gallery-dense` 或 `.wechat-gallery-lu-fill` 等专用布局 |

**经验**：截图页优先 **contain**；只有用户明确要求或 `.chat-shot-trim-x` 时才裁切。  
多图页若超高，应 **减 gap、缩小标题区、参考 PDF 相对位置** 而非简单缩小到看不清。

---

## 6. UI Components

### 6.1 表格 `.sfk-table`

- 表头：`--sfk-magenta` 底 + 白字  
- 单元格：黑底 + `#B3B3B3` 边框，文字居中  
- 案例对比：`.case-summary-table` + `.slide-case-summary-table-only`

### 6.2 标签与卡片

- `.case-tag` / `.case-tag-orange`：路径标签  
- `.case-card-grid`：五列概览卡片，可 `data-goto` 跳转  
- `.assignment-box`：左侧品红竖线的作业/要点框

### 6.3 背景动效

- `#global-bg-canvas`：全局网格变形，opacity ≈ 0.22  
- `.slide-bg-canvas-host`：单页 Canvas（章节开篇等）  
- 非必要不加重 Canvas / iframe（见 `.cursorrules`）

---

## 7. Content Slide Types（模板）

| 类型 | 类组合 | 用途 |
|------|--------|------|
| 封面 | `.title-slide` + `.cover-brand-image` | 主视觉 + H1 + 副标题 |
| 议程 | `.slide-agenda` + `.segment-arrow` | 见 `segment_arrow.md` |
| 章节开篇 | `.section-opener` | 黑底居中标题，**不用**全品红块 `.section-header` |
| 案例导读 | `.slide-layout-split` + `.case-tag-row` | 标签 + 结论 + 截图 |
| 截图专页 | `.slide-wechat-board` + gallery 变体 | 聊天证据 |
| 项目展示 | `.case-project-showcase` + visual grid | 渲染图 + 说明列表 |
| 互动 | `.interactive-zone` + `scripts/` 模块 | 游戏/配对，须 `stopPropagation` |

---

## CSS Architecture（分片索引）

`style_guide.css` 仅为 import hub；**编辑时打开对应分片**，避免在 hub 里写规则。

| 文件 | 主要内容 |
|------|----------|
| `styles/style-guide/01-tokens-base.css` | `:root` token、Reveal 基底、进度条、`.slide-content-layer` |
| `styles/style-guide/02-layout-ui.css` | 字重/强调类、封面·章节布局、`.sfk-table` |
| `styles/style-guide/03-portfolio.css` | 作品集模块、mesh 环绕页、页角 logo / footer |
| `styles/style-guide/04-cases-interactive.css` | 内容页 H2 带、案例卡、微信截图、互动布局、QHD |
| `styles/style-guide/05-employment-major.css` | 就业页、商业现象双卡、专业 picker、结束页 |
| `styles/style-guide/06-transitions-salary.css` | 转场 FX、portfolio 三轴、薪资 toggle / ECharts |
| `styles/style-guide/07-mesh-lightbox.css` | 成长性时间轴、聊天 lightbox、mesh slide 层级 |
| `styles/style-guide/08-segment-arrow-share.css` | 分段箭头、议程/成长性箭头布局、share lock |
| `styles/style-guide/09-deck-light-extension.css` | 主 deck 浅色主题（`html.deck-light`） |
| `styles/style-guide/10-portrait-adapt.css` | 竖屏通用覆盖（`html.deck-portrait`）、横屏提示条 |
| `styles/style-guide/11-quiz-live.css` | **quiz-live 独立站点**（`.ql-*` / `--ql-*`）；经 `quiz-live/css/quiz-live.css` 加载，**不** import 入主 deck hub |

完整检索表：[`../styles/style-guide/README.md`](../styles/style-guide/README.md)。Monorepo：[`../docs/monorepo.md`](../docs/monorepo.md)。quiz-live 说明：[`QUIZ_LIVE_GUIDE.md`](QUIZ_LIVE_GUIDE.md)。

---

## 8. CSS 使用规则（AI / 开发者）

1. **禁止 inline style**（动态坐标除外）  
2. **只使用** 分片 / hub 中已有或新增的类（对外仍称 `style_guide.css`）  
3. 新增可复用类 → 写入**对应** `styles/style-guide/*.css` + 更新 `style_guide_extended.md`（必要时更新 `styles/style-guide/README.md`）  
4. 新增设计 token → 写入 `01-tokens-base.css` 的 `:root` 并同步本文 §2–§4  
5. 修改 `scripts/*.js`、`shared/scripts/*.js` 或任一分片后递增 HTML 中的 `style_guide.css?v=` 与脚本 `?v=`  
6. 修改内容页标题 token 或 `fitSlidePageTitles()` 逻辑时，同步更新本文 §4.4 与 `.cursorrules` §1 / §5  
7. 修改进度条 token、`shared/scripts/slide-progress.js` 或 **bar 渐变**（`--deck-progress-bar-*` / `--deck-progress-thumb-pct`）时，同步更新本文 §4.5 与 `.cursorrules` §1  
8. 修改翻页条布局或 `bindDeckNavCluster()` 时，同步更新本文 §4.3 与 `.cursorrules` §1  
9. PDF 图片提取：`../scripts/extract_pdf_images.py`（含方向修正）— 多 PDF 时用 `--pdf` / `--out` / `--page`（见 [`../contents/README.md`](../contents/README.md)）；抽图后运行 `../scripts/compress_web_assets.py`
10. 网页图片压缩：[`IMAGE_COMPRESSION_GUIDE.md`](IMAGE_COMPRESSION_GUIDE.md) — 新增/替换 `assets/` 大图（≥ 80 KB 或长边 > 1920px）必须先压缩再引用
11. Deck 结构：先改 [`../outline.md`](../outline.md)（规范见 [`OUTLINE_GUIDE.md`](OUTLINE_GUIDE.md)），再改 `../index.html`

---

## 9. Module Status

| 模块 | 状态 | 说明 |
|------|------|------|
| 作品集规划 | **已完成** | 开篇 + 学生特点 / 院校 / 热点 共 4 页 |
| 往届优秀学员就业案例 | **已完成** | 除非用户明确要求，否则不改已有 slide |
| 全球就业形势 & 薪资 | **已完成** | 开篇 + 形势 3 页 + 薪资 2 页 + 趋势互动 |
| 如何选专业方向 | **已完成** | 开篇 + 兴趣互动 / 薪资 / 成长性 + 结束页 |

新模块开发顺序：读 [`../outline.md`](../outline.md)（[`OUTLINE_GUIDE.md`](OUTLINE_GUIDE.md)）→ 抽内容 / 图 → 选 layout 类 → 按 [`transition_guide.md`](transition_guide.md) 设转场 → Speaker notes 补细节。
