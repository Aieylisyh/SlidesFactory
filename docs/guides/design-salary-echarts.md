# 中美游戏薪资 · ECharts 动态图表设计规范

> **Figma 稿**：<https://www.figma.com/design/QLH5Sj8JwDUr6xB1zxm41Q>  
> **对应幻灯片**：`slide-employment-salary-toggle` · `index.html` 岗位与工具链 · 薪资结构  
> **替换目标**：当前 `salary-toggle.js` 静态 PDF 截图切换

---

## 1. 设计目标

| 交互 | 说明 |
|------|------|
| 悬停 Tooltip | 十字准线 + 浮层，显示国内/美国精确薪资与需求指数 |
| 图例 Toggle | 点击岗位名隐藏/显示对应曲线（淡出 + 图例 35% 透明度） |
| 时间滑块 | 2020–2025 拖拽/播放，曲线与表格联动插值动画 |
| Tab 切换 | 保留现有五 Tab（国内大厂 + 美国四条线），切换时 ECharts 重绘 |

---

## 2. 品牌色（ECharts / DOM 统一）

| Token | Hex | 用途 |
|-------|-----|------|
| `--bg-color` | `#000000` | 幻灯片背景 |
| `--panel-bg` | `#111111` | 图表区、图例、滑块容器 |
| `--sfk-magenta` | `#C82464` | 主曲线 · 表头 · 滑块填充 · Tooltip 边框 · 选中 Tab |
| `--sfk-magenta-light` | `#E05688` | 次曲线 · 美国薪资线 |
| `--sfk-cyan` | `#00D4FF` | 策划曲线 |
| `--sfk-teal` | `#00C896` | TA · 需求指数文字 |
| `--sfk-blue` | `#48A8F0` | 音频 / 辅助系列 |
| `--text-main` | `#FFFFFF` | 标题 · 激活态文字 |
| `--text-muted` | `#B3B3B3` | 轴标签 · 网格 · **表格边框** |
| 面板描边 | `#444444` | 容器 1px 边框（对齐 `.salary-toggle-btn` 未激活态） |

**曲线配色顺序（5 岗位）**：magenta → magenta-light → cyan → teal → blue

---

## 3. 版式（1920×1080 逻辑画布）

```
┌─ padding 48px ─────────────────────────────────────────────┐
│ H2 中美游戏行业薪资对比                          [DMA Logo] │
│ ─── 品红下划线 320×3px                                      │
│ Lead 18px muted（单行或最多两行）                            │
├─────────────────────────────────────────────────────────────┤
│ TabBar 36px · gap 8 · 复用 .salary-toggle-bar-quint         │
├──────────────────────────────┬──────────────────────────────┤
│ ECharts 主图区  ~72% 宽      │ Legend 图例区 ~28% 宽        │
│ 高 420px · #111 底 + #444 边 │ 可点击行 · 隐藏态标注        │
├──────────────────────────────┴──────────────────────────────┤
│ TimeSlider 72px · 品红轨道 + 圆形 Thumb                    │
├─────────────────────────────────────────────────────────────┤
│ .sfk-table · 表头品红 · 4 列 × 4 行数据                    │
└─────────────────────────────────────────────────────────────┘
```

| 区域 | 尺寸 / 类名 |
|------|-------------|
| 标题 | 首个 `h2`，走 `fitSlidePageTitles()`，勿手写字号 |
| Lead | `.employment-lead` · `0.48em` |
| Tab | `.salary-toggle-btn` / `.is-active` |
| 图表容器 | 新建 `.salary-echarts-panel` |
| 图例 | 新建 `.salary-echarts-legend` |
| 滑块 | 新建 `.salary-echarts-slider` |
| 表格 | 现有 `.sfk-table` |

---

## 4. 表格样式（`.sfk-table`）

与 `style_guide.css` 保持一致，ECharts 页底部对照表：

| 元素 | 样式 |
|------|------|
| `th` | 背景 `#C82464`，白字，粗体，padding 15px，居中 |
| `td` | 背景 `#000`，白字，padding 12–15px，居中 |
| 边框 | 全单元格 `1px solid #B3B3B3` |
| 趋势列 | `↑` 用语义色 `--sfk-magenta`；`→` 用 `--text-muted` |

建议列：**岗位 · 国内参考(万/年) · 美国参考(k USD) · 近5年需求趋势**

数据用 `contents/data/salary.json`（待建），禁止 HTML 硬编码假精确数。

---

## 5. ECharts 配置要点

```javascript
// 主题色注入
const SFK = {
  magenta: '#C82464',
  magentaLight: '#E05688',
  cyan: '#00D4FF',
  teal: '#00C896',
  blue: '#48A8F0',
  grid: 'rgba(179,179,179,0.25)',
  axis: '#B3B3B3',
  tooltipBg: '#1E1E1E',
  tooltipBorder: '#C82464'
};

// 建议 chart 类型
series: [
  { type: 'line', smooth: true, areaStyle: { opacity: 0.08 } }
]

// tooltip
tooltip: {
  trigger: 'axis',
  backgroundColor: SFK.tooltipBg,
  borderColor: SFK.tooltipBorder,
  borderWidth: 1,
  textStyle: { color: '#fff', fontSize: 12 }
}

// 时间轴 — 与自定义滑块联动 dataZoom 或 timeline
dataZoom: [{ type: 'slider', start: 0, end: 100, /* 样式见 Figma */ }]
```

| 行为 | 实现建议 |
|------|----------|
| 图例点击 | **右侧自定义 DOM** 图例（非 ECharts 内置 legend），调用 `chart.dispatchAction({ type: 'legendToggleSelect' })` 或维护 `series` visible 状态 |
| 悬停 | `axisPointer: { type: 'cross', lineStyle: { color: 'rgba(179,179,179,0.4)' } }` |
| 时间动画 | 滑块 `input` 事件更新 `dataZoom`；可选「播放」按钮每 800ms 步进 |
| Tab 切换 | 销毁/重建 chart 或 `setOption` 全量替换；`.interactive-zone` 内 `stopPropagation` |

---

## 6. 动效

| 场景 | 参数 |
|------|------|
| 曲线进入 | `animationDuration: 800`, `animationEasing: 'cubicOut'` |
| 图例隐藏 | 曲线 `opacity → 0.15`，300ms |
| Tab 切换 | 与现有 `salary-img-swap` 类似，chart 容器 `opacity 0.35→1` · 360ms |
| 滑块拖拽 | 数据插值过渡 400ms |

`prefers-reduced-motion: reduce` 时关闭动画。

---

## 7. 实现文件规划（下一阶段）

| 文件 | 职责 |
|------|------|
| `scripts/employment/salary-echarts.js` | Chart 初始化、Tab/图例/滑块联动 |
| `contents/data/salary.json` | 分 Tab 的时序 + 表格数据 |
| `style_guide.css` | `.salary-echarts-*` 组件类 |
| `index.html` | 替换 `<img data-salary-img>` 为 `<div data-salary-chart>` |
| `style_guide_extended.md` | 组件索引补充 |

CDN：`echarts@5`（与 Reveal 同 CDN 策略，需教室联网）。

---

## 8. 无障碍

- Tab：`role="tablist"` / `aria-selected`（已有）
- 图例按钮：`aria-pressed`
- 滑块：`role="slider"` · `aria-valuemin/max/now`
- 图表区：`aria-label="中美游戏岗位薪资与需求趋势图"`
