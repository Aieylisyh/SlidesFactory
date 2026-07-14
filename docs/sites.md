# Sites — 多站点入口

本 Monorepo 内各站点的 URL 路径与职责。部署后前缀见 `deploy/sync.env` 中的 `PUBLIC_BASE_URL`。

## 主 deck — 数字娱乐技术的就业

| 项 | 值 |
|----|-----|
| 入口 | `/index.html` 或 `/` |
| Outline | [`config/outline.md`](../config/outline.md) |
| 样式 | `style_guide.css`（含 01–10 分片） |
| 脚本 | `shared/scripts/*` + [`scripts/`](../scripts/README.md) |
| 资产 | `assets/`、`data/salary.json` |

## 夏校 — USC × 游研社说明会

| 项 | 值 |
|----|-----|
| 入口 | `/summerschool/index.html` |
| Outline | [`summerschool/outline.md`](../summerschool/outline.md) |
| 样式 | `../style_guide.css` + `style_extension.css`（hub → `css/ss-*.css`）+ `portrait-deck-adapt-extension.css` |
| 脚本 | `../shared/scripts/*` + `summerschool/scripts/*` + 自包含 `summerschool/modules/*` |
| 数据 | `summerschool/data/` |
| Ice Break | [`summerschool/modules/ice-break/`](../summerschool/modules/ice-break/)；末页唯一页面、逻辑与生产素材来源 |

## 暖场抢答 — quiz-live（已封存）

> **2026-06-07 起停止在本 Monorepo 内开发**；活跃产品线为 **Quiz Online Game**（`D:\SFK\SuperTool\QuizOnlineGame`）。  
> 封存说明：[`quiz-live/ARCHIVED.md`](../quiz-live/ARCHIVED.md)

| 项 | 值 |
|----|-----|
| 状态 | 保留代码与部署路径，仅运维 / 紧急修复 |
| 入口 | `/quiz-live/admin.html`（控台） |
| 观众 | `/quiz-live/answer.html?room=房间码` |
| 大屏 | `/quiz-live/screen.html?room=房间码` |
| 样式 | `quiz-live/css/quiz-live.css` → [`styles/style-guide/11-quiz-live.css`](../styles/style-guide/11-quiz-live.css) |
| 脚本 | `quiz-live/scripts/*`（见 [`quiz-live/scripts/README.md`](../quiz-live/scripts/README.md)） |
| 题库 | `quiz-live/data/quiz/question_cfg.json` + `questions_*.json` |
| 广播 | `quiz-live/data/broadcast-config.json` |
| 登记 | `quiz-live/data/register-config.json` |
| 中继 | `node quiz-live/scripts/quiz-ws-relay.js`（端口 8082） |
| 启动 | `quiz-live/start-quiz-server.bat` |
| 文档 | [`docs/guides/QUIZ_LIVE_GUIDE.md`](../docs/guides/QUIZ_LIVE_GUIDE.md) |

## 远程翻页

| 项 | 值 |
|----|-----|
| Presenter | `/remoteNavigator/presenter.html` |
| Remote | `/remoteNavigator/remote.html` |
| 夏校 Presenter | `/remoteNavigator/presenter-summerschool.html` |
| 夏校翻页笔 | `/summerschool/r/{房间码}` |
| 生成导航 | `node remoteNavigator/scripts/generate-deck-nav.js --deck index.html` |
| 夏校导航 | `node remoteNavigator/scripts/generate-deck-nav.js --deck summerschool/index.html` |
| 夏校局域网启动 | `summerschool/start-remote-server.bat` |
| Ice Break 控制 | 单主持人手机显示/隐藏骰子、开始投掷、停止结算；运行时见 [`summerschool/modules/ice-break/README.md`](../summerschool/modules/ice-break/README.md) |

架构说明：[docs/monorepo.md](../docs/monorepo.md)
