# SFK 幻灯片工坊 — 文档索引

## 快速路由

| 场景 | 文档 |
|------|------|
| **全部规范文档** | [guides/README.md](guides/README.md) |
| 项目结构与多站点 | [monorepo.md](monorepo.md) · [sites.md](sites.md) |
| 主 deck 页序（内容） | [config/outline.md](../config/outline.md) · [guides/OUTLINE_GUIDE.md](guides/OUTLINE_GUIDE.md) |
| 样式 hub | [style_guide.css](../style_guide.css) · [styles/style-guide/README.md](../styles/style-guide/README.md) |
| 主 deck JS 目录 | [scripts/README.md](../scripts/README.md) |
| 工具脚本 | [tools/README.md](../tools/README.md) |
| quiz-live（已封存） | [guides/QUIZ_LIVE_GUIDE.md](guides/QUIZ_LIVE_GUIDE.md) · [quiz-live/ARCHIVED.md](../quiz-live/ARCHIVED.md) |
| Agent 规则 | [.cursorrules](../.cursorrules) |

## Co-located 文档

| 路径 | 用途 |
|------|------|
| `styles/style-guide/README.md` | CSS 分片编辑路由 |
| `contents/README.md` | 源 PDF / 抽图 / 压缩串联 |
| `contents/data/README.md` | 薪资等 JSON 策划入口 |
| `shared/README.md` | 跨站点共享 JS |
| `config/README.md` | 主 deck 配置说明 |
| `summerschool/outline.md` | 夏校 deck 结构 |
| `summerschool/css/README.md` | 夏校 CSS 分片 |
| `quiz-live/scripts/README.md` | 暖场抢答 JS / relay（**已封存**） |
| `quiz-live/ARCHIVED.md` | quiz-live 封存说明与迁移指引 |
| `deploy/部署脚本说明.md` | 部署 BAT / PS1 中文说明 |

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
