# 幻灯片转场规范（Transition Guide）

> 本演示使用 **Reveal.js 内置转场 = `none`**，页内进入动画由 `scripts/chrome/slide-transitions.js` 统一分配。  
> 新增模块时请遵循本文，**不要**在 `Reveal.initialize` 里改 `transition: 'slide'` 等默认值。

---

## 1. 设计原则（模块一经验总结）

| 原则 | 说明 |
|------|------|
| **少即是多** | 全库 20 种效果，日常只轮换 3 种「普通」+ 3 种「关键」，避免每页都不同造成疲劳 |
| **章节 vs 内容** | 新章节开篇、议程跳转处用「关键转场」；案例细节、数据页用「普通转场」 |
| **不干扰阅读** | 动画作用在 `.slide-content-layer` 上，时长约 0.6–0.9s；`prefers-reduced-motion` 时自动跳过 |
| **无 UI 标签** | 不向观众展示效果名称；`data-transition-label` 仅供开发调试 |
| **线性翻页** | 与 `navigationMode: 'linear'` 配合：每次 `slidechanged` 触发当前 leaf slide 的 enter 动画 |

---

## 2. 效果库（20 种）

| ID | 显示名 |  tier 建议 |
|----|--------|-----------|
| `fade-up` | 01 · 逐层上浮 | 备用 |
| `glitch` | 02 · 故障切片 | 备用 |
| **`zoom-blur`** | **03 · 电影变焦** | **关键 KEY** |
| **`curtain`** | **04 · 幕布揭幕** | **关键 KEY** |
| `circle` | 05 · 圆形扩散 | 备用 |
| **`flip-y`** | **06 · 3D 翻转** | **关键 KEY** |
| `elastic` | 07 · 弹性弹出 | 备用 |
| `skew` | 08 · 斜切滑入 | 备用 |
| `split-x` | 09 · 中线裂开 | 备用 |
| `scanline` | 10 · 扫描线 | 备用 |
| **`chroma`** | **11 · 色差冲击** | **普通 NORMAL** |
| `slide-left` | 12 · 横向冲刺 | 备用 |
| `rotate-in` | 13 · 旋转落定 | 备用 |
| **`blur-wipe`** | **14 · 模糊擦除** | **普通 NORMAL** |
| `pixel-grid` | 15 · 像素网格 | 备用 |
| `neon` | 16 · 霓虹闪烁 | 备用 |
| **`depth`** | **17 · 纵深叠入** | **普通 NORMAL** |
| `ripple` | 18 · 水波涟漪 | 备用 |
| `shatter` | 19 · 碎片聚合 | 备用 |
| `melt` | 20 · 熔融滴落 | 备用 |

**关键 KEY 池**：`zoom-blur` → `curtain` → `flip-y`（03 / 04 / 06）  
**普通 NORMAL 池**：`depth` → `blur-wipe` → `chroma`（17 / 14 / 11）循环

---

## 3. 自动分配算法

脚本在 `Reveal` ready 时扫描所有 **leaf slide**（不含子 `section` 的父级），按 **1-based 页码** 分配：

```
优先级（高 → 低）：
1. data-transition-key="curtain"     → 强制指定
2. FIXED_KEY_PAGES[页码]             → 全局固定关键页（见下表）
3. data-transition-tier="key"        → 在 KEY 池中轮换
4. 默认                             → 在 NORMAL 池中轮换
```

### 3.1 案例模块关键转场（HTML 声明）

| 页面 | `data-transition-key` |
|------|------------------------|
| 案例章节开篇 | `zoom-blur` |
| 学员去向对对碰 | `curtain` |
| 崔同学 · SFK 项目（第 6 页） | `flip-y` |

> `FIXED_KEY_PAGES` 已弃用；新模块章节开篇用 `data-transition-tier="key"`（如作品集规划开篇）。

### 3.2 历史说明

早期版本曾用 1-based 页码表固定第 3 / 4 / 6 页，插入新模块后已改为上表 HTML 声明。

---

## 4. 新模块如何指定转场

### 4.1 推荐：HTML 声明（不改 JS）

```html
<!-- 新章节开篇：自动使用 KEY 池下一个（03/04/06 轮换） -->
<section class="content-slide section-opener" data-transition-tier="key" ...>

<!-- 强制某一效果 -->
<section class="content-slide" data-transition-key="curtain" ...>

<!-- 普通内容页：不写任何属性，走 NORMAL 池循环 -->
<section class="content-slide" ...>
```

### 4.2 不推荐：继续往 `FIXED_KEY_PAGES` 加页码

`FIXED_KEY_PAGES` 仅服务已交付的案例模块。新章节请用 `data-transition-tier="key"`。

### 4.3 leaf slide 定义

- **算一页**：`<section class="content-slide">` 且无直接子 `<section>`
- **不算页**：仅用于 HTML 分组的父 `<section>`（如「崔同学」外层包裹）
- 动画目标：优先 `.slide-content-layer`，否则整个 `section`

---

## 5. 与新章节类型的搭配建议

| 页面类型 | 推荐 tier | 推荐类名 | 说明 |
|----------|-----------|----------|------|
| 大章节开篇 | `key` | `.section-opener` | 幕布/翻转等强节奏 |
| 议程 / 目录跳转 | `key` | `.content-slide` | 与上一模块首章一致 |
| 数据表 / 对比 | 默认 normal | `.sfk-table` | 纵深/模糊，不抢数据 |
| 截图证据墙 | 默认 normal | `.slide-wechat-board` | 内容已够满，轻转场 |
| 互动游戏页 | `key` 或 `data-transition-key="elastic"` | `.interactive-zone` | 进入感更强 |
| 全屏单图 | 默认 normal | `.slide-image-full` | 避免 overlay 冲突 |

---

## 6. 实现与样式依赖

| 文件 | 职责 |
|------|------|
| `scripts/chrome/slide-transitions.js` | 分配逻辑 + Web Animations API 实现 |
| `styles/style-guide/06-transitions-salary.css` — `/* Custom slide transition FX */` | overlay、clip-path、3D 等辅助类 |
| `scripts/core/deck-reveal.js` | `transition: 'none'`，ready 后 `SlideTransitionFX.bind(Reveal)` |

修改转场脚本后，请递增 `index.html` 中 `slide-transitions.js?v=N`。

---

## 7. 常见问题

**Q：为什么 Reveal 自带转场关掉了？**  
A：避免与自定义 enter 动画双重播放；背景仍可用 `backgroundTransition: 'fade'`。

**Q：竖向 nested section 怎么算页码？**  
A：linear 模式下全部 leaf slide 按 DOM 顺序平铺计数；父 section 不计页。

**Q：新模块第一页想固定用「幕布」？**  
A：`<section ... data-transition-key="curtain">` 即可。

**Q：动画卡顿？**  
A：检查是否在 slide 内嵌入了未 `stopPropagation` 的重 Canvas；减少同页 DOM 深度；尊重 `prefers-reduced-motion`。

---

## 8. 快速检查清单（新 slide 提交前）

- [ ] 是 leaf `section`，含 `.slide-content-layer`
- [ ] 章节页已加 `data-transition-tier="key"`（若需要）
- [ ] 未修改案例模块已有 slide 的 `data-transition-*`（除非用户要求）
- [ ] 长讲解放在 `<aside class="notes">`，不在 slide 上堆字
- [ ] 改动了 `slide-transitions.js` 并已更新 `?v=` 缓存参数
