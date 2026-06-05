# SFK 幻灯片工坊 — 文档索引

**说明类规范**已归档至 **[guides/README.md](../guides/README.md)**。本页保留仓库级元数据入口。

## 快速路由

| 场景 | 文档 |
|------|------|
| **全部说明文档** | [guides/README.md](../guides/README.md) |
| 项目结构与多站点 | [monorepo.md](monorepo.md) · [sites/README.md](../sites/README.md) |
| 主 deck 页序（内容） | [outline.md](../outline.md) · [guides/OUTLINE_GUIDE.md](../guides/OUTLINE_GUIDE.md) |
| 样式 hub | [style_guide.css](../style_guide.css) · [styles/style-guide/README.md](../styles/style-guide/README.md) |
| Agent 规则 | [.cursorrules](../.cursorrules) |

## Co-located 文档（未迁入 guides/）

| 路径 | 用途 |
|------|------|
| `styles/style-guide/README.md` | CSS 分片编辑路由 |
| `contents/README.md` | 源 PDF / 抽图 / 压缩串联 |
| `shared/README.md` | 跨站点共享 JS |
| `sites/README.md` | 各站点入口 URL |
| `summerschool/outline.md` | 夏校 deck 结构 |

## 架构图

| 文件 | 用途 |
|------|------|
| [deck-architecture.mermaid](deck-architecture.mermaid) | 主 deck 四模块流程 |

## Cursor Agent Skills

| Skill | 路径 |
|-------|------|
| Deck 进度条 | [.cursor/skills/deck-progress-bar/SKILL.md](../.cursor/skills/deck-progress-bar/SKILL.md) |
| 竖屏适配 | [.cursor/skills/portrait-deck-adapt/SKILL.md](../.cursor/skills/portrait-deck-adapt/SKILL.md) |

## 部署

`deploy/sync.ps1` · 配置见 `deploy/sync.env.example`。详见 [monorepo.md](monorepo.md#部署)。
