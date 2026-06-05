# Segment Arrow · 分段横向箭头

> **本文件为箭头组件的唯一规范参考。** 新增或修改箭头页面前必须先读本文。  
> 实现：`styles/style-guide/08-segment-arrow-share.css`（`.segment-arrow-*`）· `scripts/segment-arrow.js` · `main.js` → `initSegmentArrow()`

---

## 1. 组件概述

横向 N 段箭身 + 右侧 SVG 三角尖；用于**时间轴 / 阶段递进**或**议程 / 章节导航**。

| 能力 | 说明 |
|------|------|
| 段数 | 3 段（`--cols-3`）或 4 段（`--cols-4`） |
| 交互 | hover / focus 当前段放大；左右相邻段 **25%** 联动；文案常显 **50%** 透明度，hover/focus **100%** |
| 布局 | **固定外壳高度**（`--segment-arrow-shell-h`），动画不推动页内其他元素 |
| 导航 | 议程段可加 `data-goto` 跳转章节；`interactive-zone` 内阻断 Reveal 指针导航 |

### 本 deck 参考实例

| 页 | Slide 类 | 段数 | 主题 | 跳转 |
|----|----------|------|------|------|
| 议程 | `.slide-agenda` | 4 | `segment-arrow-theme-red` | `data-goto="#/chapter-id"` |
| 成长性 | `.slide-major-growth` | 3 | `segment-arrow-theme-gold` | 无 |

---

## 2. 视觉规范

### 2.1 箭身分段

- 每段右缘 **`::after` 细灰分隔条**：宽 **6px**，**上下贯穿**箭身，浅灰纵向渐变 + 轻微高光。
- 段间不再使用 `border-right`；**每一段**（含与三角尖相邻的最后一段）均有分隔条。

### 2.2 右侧三角尖（SVG）

- **左缘**：直角竖线（无上下圆角）。
- **右端**：仅尖端保留圆角（二次贝塞尔）。
- **尺寸**：使用**绝对** `width` / `height`（`--segment-arrow-tip-w` / `-h`），不用 `scale` 拉伸容器；左缘锚点垂直居中于箭身（`top: 50%` + `translateY(-50%)`）。
- **配色**：与**最后一段箭身**渐变一致（议程：浅红；成长性：金色）。

标准 path（`viewBox="0 0 200 72"`）：

```svg
<path d="M 0 0 L 0 72 L 165 42 Q 196 36 165 30 Z" />
```

### 2.3 主题配色

| 修饰类 | 用途 | 段色递进 |
|--------|------|----------|
| `.segment-arrow-theme-gold` | 成长性时间轴 | 浅金 → 中金 → 深金 |
| `.segment-arrow-theme-red` | 议程导航 | 主题红 `#C82464` → 浅红 `#FDE0EA`；03/04 段文字 `#5c1838` |

三角尖 SVG 使用独立 gradient id：`segment-arrow-tip-grad-gold` / `segment-arrow-tip-grad-red`。

---

## 3. Slide 与脚本接线

```html
<section class="content-slide …" data-background-color="#000" data-segment-arrow="true">
```

- `index.html` 须已引入 `scripts/segment-arrow.js`。
- `main.js` 在 `initSlideModules` 中对 `[data-segment-arrow-root]` 实例化 `SegmentArrow`。
- 修改 `styles/style-guide/08-segment-arrow-share.css` 或 `segment-arrow.js` 后 bump `?v=`。

---

## 4. HTML 骨架

### 4.1 通用结构

```html
<div class="segment-arrow interactive-zone" data-segment-arrow-root aria-label="…">
  <div class="segment-arrow-grid segment-arrow-grid--cols-N segment-arrow-theme-…">
    <!-- 可选：里程碑区（成长性） -->
    <div class="segment-arrow-labels">…</div>

    <div class="segment-arrow-row">
      <div class="segment-arrow-segment" data-segment-arrow-segment tabindex="0"
           role="group|link" aria-label="…" [data-goto="#/id"]>
        <p class="segment-arrow-segment-title">…</p>
        <ul class="segment-arrow-segment-list"><li>…</li></ul>  <!-- 可选 -->
      </div>
      <!-- …每段一列… -->
      <div class="segment-arrow-tip segment-arrow-tip--gold|red" aria-hidden="true">
        <svg viewBox="0 0 200 72" preserveAspectRatio="none">…</svg>
      </div>
    </div>

    <!-- 可选：底栏（年限 / 序号） -->
    <div class="segment-arrow-footer">
      <span class="segment-arrow-footer-item">…</span>
      <!-- 段数 + 1 列：末列为 head-spacer -->
      <span class="segment-arrow-head-spacer" aria-hidden="true"></span>
    </div>
  </div>
</div>
```

### 4.2 列数与占位

| 修饰类 | 箭身列 | 顶/底栏 grid |
|--------|--------|----------------|
| `.segment-arrow-grid--cols-3` | `1fr 1.12fr 1fr` | 3 段 + `head-spacer` |
| `.segment-arrow-grid--cols-4` | `repeat(4, 1fr)` | 4 段 + `head-spacer` |

里程碑区每段一列 `.segment-arrow-label-cell`；stem 高度： `--tall` / `--mid` / `--short`。

### 4.3 议程跳转

```html
<div class="segment-arrow-segment" data-segment-arrow-segment
     data-goto="#/portfolio-planning" tabindex="0" role="link" aria-label="…">
```

---

## 5. 交互与动画

| 状态 | 变换 |
|------|------|
| 当前段 hover/focus | `translateY(-12px) scale(1.12)` |
| 左右相邻段 | `translateY(-3px) scale(1.03)`（**25%** 强度） |
| 最后段 hover 时三角尖 | 在居中基础上 `translateY(calc(-50% - 3px)) scale(1.03)` |

- 段内 `.segment-arrow-segment-title` / `-list` 与上方 `.segment-arrow-label-text` / `-stem` **始终可见**（`opacity: 0.5`）；hover/focus 当前段时对应文案升至 `opacity: 1`。
- 文案 **绝对定位**于段内，避免撑高箭身。
- 有列表的段：标题 `top: 20%`，列表 `top: 58%`。
- 里程碑标签区 **固定高度 76px**（不随 hover 伸缩）；标签常显 50% 透明度，hover/focus 对应段时升至 100%。
- 适配翻页笔等无鼠标悬停场景：默认可读，hover 仅作强调。

### 事件冒泡

`SegmentArrow` 在根节点阻断 `mousedown` / `mouseup` / `click` / `touchstart` / `touchend` 的冒泡。  
**不要**在 `.interactive-zone` 内阻断 `wheel`（见 `WHEEL_NAV_GUIDE.md`）。

---

## 6. 布局常量（固定高度）

动画不得改变 `.segment-arrow-grid` 占位高度。外壳由 token 计算：

| Token | 默认 / 说明 |
|-------|-------------|
| `--segment-arrow-hover-cushion` | `28px` — 箭身上方 hover 抬升缓冲 |
| `--segment-arrow-row-h` | 箭身行高（见下表） |
| `--segment-arrow-labels-block` | `100px`（有里程碑时）；议程 `0` |
| `--segment-arrow-footer-block` | `36px` |
| `--segment-arrow-shell-h` | `labels + cushion + row-h + footer` |

| 页面 | `--segment-arrow-row-h` | 三角尖（约） |
|------|-------------------------|--------------|
| `.slide-major-growth` | `min(28vh, 248px)` | `177px × min(46.37vh, 411px)` |
| `.slide-agenda` | `min(28vh, 248px)` | `210px × min(46.37vh, 411px)` |

议程页 `.slide-agenda .slide-content-layer` 使用 `justify-content: center`，标题 + 箭头作为一组垂直居中。

- `.segment-arrow`、`.segment-arrow-grid` 使用 `flex: 0 0 auto` + 固定 `height` / `min-height` / `max-height`。
- 箭身行含 `padding-top: var(--segment-arrow-hover-cushion)`，段 `transform-origin: center bottom`。

---

## 7. 修饰类速查

| 类 / 属性 | 说明 |
|-----------|------|
| `.segment-arrow` | 外层居中容器 |
| `.segment-arrow-grid` | 固定高度网格壳 |
| `.segment-arrow-labels` | 上方里程碑（成长性） |
| `.segment-arrow-row` | 箭身 + 三角尖行 |
| `.segment-arrow-segment` | 单段箭身 |
| `.segment-arrow-tip` | 绝对定位 SVG 尖 |
| `.segment-arrow-footer` | 底栏年限 / 序号 |
| `.segment-arrow-head-spacer` | 与三角尖等宽的 grid 占位列 |
| `.segment-arrow--show-title` | 段标题强制 100% 不透明（跳过 idle 50%） |

---

## 8. 新增页面 Checklist

1. 读 `outline.md` 确认页序与文案。
2. 选 `--cols-3|4`、`.segment-arrow-theme-gold|red`（或扩展新主题时同步 `08-segment-arrow-share.css`）。
3. 按 §4 搭 HTML；段数与 footer/labels 列数一致（+ `head-spacer`）。
4. Slide 加 `data-segment-arrow="true"`；根节点 `data-segment-arrow-root` + `.interactive-zone`。
5. 三角尖 path 与 gradient 与最后一段配色一致。
6. 需跳转的段加 `data-goto` + `role="link"`。
7. bump `style_guide.css?v=`；本地用 `start-lan-server.bat` 预览 hover 时页内其他元素不位移。

---

## 9. 扩展新主题

在 [`../styles/style-guide/08-segment-arrow-share.css`](../styles/style-guide/08-segment-arrow-share.css) 增加 `.segment-arrow-theme-*` 段渐变、底栏字色、三角尖 gradient id；在本文 §2.3 与 §7 登记。保持 `style_guide_extended.md` 组件表仅一行指向本文。
