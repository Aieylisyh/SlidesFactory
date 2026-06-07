# quiz-live 模块封存说明

> **封存日期**：2026-06-07  
> **状态**：保留于本 Monorepo，**停止新功能开发**

## 背景

`quiz-live/` 已拆分为独立产品线 **[Quiz Online Game](D:/SFK/SuperTool/QuizOnlineGame)**（本地路径）。后续功能迭代、题库扩展、部署脚本演进均在独立仓库进行。

本目录保留为 **SlidesFactory Monorepo 内的只读快照**，便于：

- 现有 COS 公网路径 `/sfkdoc/quiz-live/` 继续可用（`deploy/quiz-live-*.bat` 仍指向此处）
- 历史 commit 与现场演示环境对照
- 必要时 cherry-pick 紧急修复回独立产品线

## 开发规则（封存后）

| 允许 | 禁止 |
|------|------|
| 线上紧急 bugfix（需同步到 QuizOnlineGame） | 新功能、UI 改版、协议变更 |
| 题库 hotfix（同上） | 在本目录重构 relay / admin |
| 文档勘误 | 将独立产品线改动只写在本目录而不同步 |

**新功能开发请打开：** `D:\SFK\SuperTool\QuizOnlineGame`

## 本目录仍可用的运维入口

| 用途 | 入口 |
|------|------|
| 本地调试 | `start-quiz-server.bat`（HTTP 8080 + WS 8082，Monorepo 根目录服务） |
| 公网静态 + relay | `deploy/quiz-live-deploy.bat` |
| 仅 relay / 题库 | `deploy/quiz-live-relay.bat` |

## 文档索引（本仓库）

| 文档 | 说明 |
|------|------|
| [`docs/guides/QUIZ_LIVE_GUIDE.md`](../docs/guides/QUIZ_LIVE_GUIDE.md) | 架构与配置（封存版，只维护勘误） |
| [`scripts/README.md`](scripts/README.md) | 脚本模块索引 |
| [`../deploy/部署脚本说明.md`](../deploy/部署脚本说明.md) | 部署 bat 说明 |
| [`../docs/sites.md`](../docs/sites.md) | Monorepo 站点入口 |

## 封存时快照（最后活跃 commit 参考）

独立产品线自本仓库 `quiz-live/` 导出，包含：分页用户管理、VIP 参赛分享、排行榜 5 分钟缓存、竖屏答题、准备页/排行榜布局等（截至 2026-06-07 的 `main` 分支状态）。

---

*本文件为封存标记；修改 quiz-live 代码前请先阅读上文「开发规则」。*
