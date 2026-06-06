# Outline · 数字娱乐技术的就业

> **结构源**：本文件定义章节顺序、页数、Reveal 锚点与实现提示。生成或修改 `index.html` 前必须先读本文。  
> **规范说明**：字段含义与模板见 [`../docs/guides/OUTLINE_GUIDE.md`](../docs/guides/OUTLINE_GUIDE.md)。

---

## Deck 元信息

| 字段 | 值 |
|------|-----|
| `deck_title` | 数字娱乐技术的就业 |
| `brand` | 南京斯芬克 · 游戏动画科系 |
| `status` | complete |
| `linear` | yes（仅横向翻页） |
| `frozen_modules` | `case-studies`（往届优秀学员就业案例） |
| `share_pages` | 全部 leaf 页已登记于 [`config/share-pages.json`](share-pages.json)；链接格式 `index.html?share=<slug>`，详见 [`../docs/guides/SHARE_GUIDE.md`](../docs/guides/SHARE_GUIDE.md) |

---

## 议程映射（`#/id`）

| 议程序号 | 章节 | `id` |
|----------|------|------|
| 01 | 作品集规划 | `portfolio-planning` |
| 02 | 往届优秀学员就业案例 | `case-studies` |
| 03 | 全球就业形势与薪资 | `employment-global` |
| 04 | 如何选专业方向 | `major-direction` |

---

# 01 · 作品集规划

| 字段 | 值 |
|------|-----|
| `id` | `portfolio-planning` |
| `pages` | 4（1 opener + 3 内容） |
| `opener` | `section-opener` · `data-transition-tier="key"` |
| `frozen` | no |

## 针对学生特点

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `slide` | `content-slide` · `interactive-zone` |
| `layout` | 双栏讲解 + `data-surround-mesh-slide` · preset `traits` |
| `assets` | `contents/作品集规划.txt` |
| `notes` | 可关联黄同学案例 |

## 针对目前院校

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `slide` | `content-slide` · 学术/就业双栏对比 |
| `layout` | `data-surround-mesh-slide` · preset `blue` |
| `assets` | `contents/作品集规划.txt` |

## 针对时下热点

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `slide` | `content-slide` · `data-portfolio-axis` |
| `layout` | `data-mesh-preset="teal"` · 三轴选择互动 |
| `scripts` | `portfolio-axis.js` |
| `assets` | `contents/时下热点.png` |

---

# 02 · 往届优秀学员就业案例

| 字段 | 值 |
|------|-----|
| `id` | `case-studies` |
| `pages` | 9–12（按学员展开） |
| `opener` | `section-opener` · `data-transition-tier="key"` |
| `frozen` | **yes** — 勿改 HTML/文案/版式，除非用户明确要求 |

## 身边的案例

| 字段 | 值 |
|------|-----|
| `pages` | 9–12 |
| `assets` | `contents/*.pdf` → `python tools/python/extract_pdf_images.py --pdf contents/<file>.pdf --out assets/pdf-extracted` → `python tools/python/compress_web_assets.py` |
| `interactive` | 可选 `data-match-game` · `scripts/cases/case-match.js` |

### 学员子页（顺序固定）

| 学员 | 说明 |
|------|------|
| 崔同学 | 项目展示 + TFE 视频页 + 微信截图页 |
| 黄同学 | 同上 |
| 李同学 | 同上 |
| 卢同学 | 同上 |
| 马同学 | 同上 |

| 字段 | 值 |
|------|-----|
| `slide_types` | `.slide-wechat-board` / `.chat-shot` · `.case-project-showcase` |
| `components` | 见 [`../docs/guides/style_guide_extended.md`](../docs/guides/style_guide_extended.md) §4、§6 |

---

# 03 · 有用的信息 · 全球就业形势与薪资

| 字段 | 值 |
|------|-----|
| `id` | `employment-global` |
| `parent` | 议程 03 |
| `pages` | 4 |

## 全球就业形势

| 字段 | 值 |
|------|-----|
| `pages` | 2 |
| `opener` | `section-opener` · `data-mesh-preset="employment"` |
| `interactive` | 无 |
| `slide_types` | `.slide-employment-global` · `.slide-employment-hits`（黑神话 / 哪吒商业数据双卡） |
| `frozen` | no |

## 中美游戏行业薪资水平

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `slide` | `data-salary-echarts` |
| `scripts` | `salary-echarts.js` |
| `frozen` | no |

---

# 04 · 如何选专业方向

| 字段 | 值 |
|------|-----|
| `id` | `major-direction` |
| `pages` | 3 |
| `opener` | `section-opener` · `data-transition-tier="key"` |

## 兴趣：能否做得下去

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `interactive` | 可选 `data-major-picker` · `major-picker.js` |
| `layout` | `data-mesh-chip-attract` |

## 薪资：能否立足社会

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `slide` | 内容页 + 数据/对比组件 |

## 成长性：多年后的自己什么样

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `slide` | `.slide-major-growth` · `.segment-arrow` |
| `layout` | 横向箭头时间轴 — 规范见 [`../docs/guides/segment_arrow.md`](../docs/guides/segment_arrow.md) |
| `interactive` | `data-segment-arrow` · `scripts/chrome/segment-arrow.js` |

---

## 收尾

| 字段 | 值 |
|------|-----|
| `slide` | `.slide-closing` · `data-transition-tier="key"` |
| `pages` | 1 |
