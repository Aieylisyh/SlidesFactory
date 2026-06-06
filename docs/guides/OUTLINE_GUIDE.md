# config/outline.md 书写规范

`config/outline.md` 是单个 deck 的**结构唯一来源**：章节顺序、页数预算、Reveal `id`、版式类名、脚本依赖与是否冻结。AI 与人工改 `index.html` 前都应先读它。

---

## 1. 文件顶部

- 一级标题：`# Outline · {演示标题}`
- 引用块：说明本文件角色，并指向 `OUTLINE_GUIDE.md`（规范）与 `starter/`（空项目模板）

## 2. Deck 元信息表

| 推荐字段 | 用途 |
|----------|------|
| `deck_title` | 浏览器标题、封面文案 |
| `brand` | 副标题、页脚 |
| `status` | `draft` / `in_progress` / `complete` |
| `linear` | 是否横向线性导航（本项目固定 yes） |
| `frozen_modules` | 已完成、禁止 AI 改动的模块 `id` 列表 |

## 3. 议程映射表

列出议程序号 → 章节中文名 → Reveal `id`（`#/portfolio-planning`），与 `index.html` 里 `data-goto` / `section id` 一致。

## 4. 每个一级章节（`# 01 · 章节名`）

章节表建议字段：

| 字段 | 说明 |
|------|------|
| `id` | HTML `section id`，全局唯一 |
| `pages` | 叶子页数量（含 opener） |
| `opener` | 通常为 `section-opener` + `data-transition-tier="key"` |
| `frozen` | `yes` 时禁止改该模块幻灯片 |

## 5. 每个二级小节（`## 小节名`）

小节表建议字段：

| 字段 | 说明 |
|------|------|
| `pages` | 本节页数 |
| `slide` | 主 class，如 `content-slide`、`slide-wechat-board` |
| `layout` | 双栏、mesh preset、画廊等 |
| `assets` | `contents/` 或抽图命令，**不写假路径**；抽图或新增大图后注明 `compress_web_assets.py`（见 `IMAGE_COMPRESSION_GUIDE.md`） |
| `scripts` | 额外 `<script>`，如 `case-match.js` |
| `interactive` | `data-*` 与对应 JS |
| `notes` | 讲者提示要点（可选） |

### 再下一级（学员、步骤列表）

用 `###` + 简单表格或列表，只写顺序与名称，不重复整表。

## 6. 命名约定

- `id`：小写英文 + 连字符，与 HTML 一致
- 页数：写区间时用 `9–12`，明确预算
- 抽图：写完整 CLI，含 `--pdf` / `--out` / `--page`；抽图后追加 `python tools/python/compress_web_assets.py`

## 7. 反例（避免）

```markdown
# 作品集规划
## 针对学生特点（1页）
```

信息不足：无 `id`、无组件提示、无素材路径、无法判断是否 frozen。

## 8. 最小可用模板

见 `starter/outline.md`。
