# Outline · 演示标题

> **结构源**：本文件定义章节顺序、页数、Reveal 锚点与实现提示。生成或修改 `index.html` 前必须先读本文。  
> **规范说明**：字段含义与模板见 [`../docs/guides/OUTLINE_GUIDE.md`](../docs/guides/OUTLINE_GUIDE.md)。

---

## Deck 元信息

| 字段 | 值 |
|------|-----|
| `deck_title` | 演示标题 |
| `brand` | 机构 / 科系 |
| `status` | draft |
| `linear` | yes（仅横向翻页） |
| `frozen_modules` | （暂无） |
| `share_pages` | 见 [`config/share-pages.json`](share-pages.json)；链接 `index.html?share=<slug>`，详见 [`../docs/guides/SHARE_GUIDE.md`](../docs/guides/SHARE_GUIDE.md) |
| `remote_nav` | 改 `index.html` 后运行 `node remoteNavigator/scripts/generate-deck-nav.js` |

---

## 议程映射（`#/id`）

| 议程序号 | 章节 | `id` |
|----------|------|------|
| 01 | 第一章 | `chapter-one` |
| 02 | 第二章 | `chapter-two` |

---

# 01 · 第一章

| 字段 | 值 |
|------|-----|
| `id` | `chapter-one` |
| `pages` | 2（1 opener + 1 内容） |
| `opener` | `section-opener` · `data-transition-tier="key"` |
| `frozen` | no |

## 标准内容页

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `slide` | `content-slide` |
| `layout` | 要点列表 + 占位图 |
| `assets` | （待填）`contents/` |
| `notes` | 讲者提示 |

---

# 02 · 第二章

| 字段 | 值 |
|------|-----|
| `id` | `chapter-two` |
| `pages` | 2 |
| `opener` | `section-opener` · `data-transition-tier="key"` |
| `frozen` | no |

## 互动区示例

| 字段 | 值 |
|------|-----|
| `pages` | 1 |
| `slide` | `content-slide` · `interactive-zone` |
| `scripts` | （按需） |
| `notes` | 互动区勿拦截 wheel |

---

# 收尾

| 字段 | 值 |
|------|-----|
| `id` | `closing` |
| `slide` | `slide-closing` · `data-transition-tier="key"` |
