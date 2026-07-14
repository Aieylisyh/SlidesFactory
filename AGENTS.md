# SFK 幻灯片工坊 · Agent 工作入口

本仓库是一个静态 Reveal.js 多站点项目。所有 Agent 先读本文，再按任务范围读取 `.codex/rules/project-rules.md`、`docs/README.md` 与对应站点的 outline。

## 项目速览

| 站点 | 入口 | 结构源 | 备注 |
|------|------|--------|------|
| 主 deck | `index.html` | `config/outline.md` | 数字娱乐技术就业主题 |
| 夏校 | `summerschool/index.html` | `summerschool/outline.md` | USC x 游研社说明会，当前重点子项目 |
| quiz-live | `quiz-live/` | `docs/guides/QUIZ_LIVE_GUIDE.md` | 已封存，仅运维或紧急修复 |
| 远程翻页 | `remoteNavigator/` | `docs/guides/REMOTE_GUIDE.md` | 主 deck 与夏校均会使用 |

## 必读顺序

1. 阅读本文件与 `.codex/rules/project-rules.md`。
2. 判断目标站点：
   - 主 deck：先读 `config/outline.md`。
   - 夏校：先读 `summerschool/outline.md`。
   - quiz-live：先读 `quiz-live/ARCHIVED.md`，除非用户明确要求，否则不做新功能。
3. 改样式前读对应 CSS README：
   - 主 deck：`styles/style-guide/README.md`
   - 夏校：`summerschool/css/README.md`
4. 涉及专项模块时读 `docs/guides/` 下的对应指南。

## Codex 本地规范

| 文件 | 用途 |
|------|------|
| `.codex/README.md` | Codex 配置目录说明 |
| `.codex/rules/project-rules.md` | 本仓库 Codex 工作规则 |
| `.codex/skills/*/SKILL.md` | 项目内 Codex skills |
| `.codexignore` | Codex 上下文与打包忽略清单 |

优先使用项目内 `.codex/skills`。`.cursor/skills` 与 `.cursorrules` 保留给 Cursor，也可作为历史参考；两边规则冲突时，以 `AGENTS.md` 和 `.codex/rules/project-rules.md` 为准。

## 开发约定

- HTML 不写 inline style；新增样式放入对应 CSS 分片，并递增 HTML 中相关 `?v=`。
- 跨站点 JS 放 `shared/scripts/`；主 deck 专用放 `scripts/`；夏校专用放 `summerschool/scripts/`。
- 新增或替换图片前遵守 `docs/guides/IMAGE_COMPRESSION_GUIDE.md`，生产资源不要提交多 MB 原图。
- 本地预览优先使用根目录 `start-lan-server.bat`；不要直接用 `file://` 打开 Reveal deck。
- 部署由 `deploy/sync.ps1` 负责；工程文档、Agent 配置与工具目录不应上传到静态站。

## 文档同步

改动任何规范、组件或目录路由时，同步更新相关 README / guide。入口索引在 `docs/README.md`，更细的规范索引在 `docs/guides/README.md`。
