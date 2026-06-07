# quiz-live/scripts — 前端与中继

> **模块已封存（2026-06-07）**：本目录停止新功能开发。活跃代码见 `D:\SFK\SuperTool\QuizOnlineGame\scripts\`。  
> 说明：[`../ARCHIVED.md`](../ARCHIVED.md)

## 浏览器端

| 文件 | 说明 |
|------|------|
| `quiz-protocol.js` | WS 消息构造与 URL 解析 |
| `quiz-ws-client.js` | 重连、心跳 |
| `quiz-register-config.js` | 观众登记表单 |
| `quiz-broadcast.js` | 大屏广播队列 UI |
| `quiz-answer-portrait.js` | 观众端竖屏锁定 |
| `quiz-answer-questions.js` | 题库预加载（question_cfg + questions_*.json） |
| `quiz-answer-ws.js` / `quiz-answer-ui.js` / `quiz-answer.js` | 观众端 |
| `quiz-admin.js` / `quiz-screen.js` | 控台 / 大屏 |

## Node 中继

入口：`quiz-ws-relay.js`（`node quiz-live/scripts/quiz-ws-relay.js`）

| 模块 | 说明 |
|------|------|
| `relay/room-store.js` | 房间、用户、VIP 分享 |
| `relay/message-handlers.js` | WS 消息路由 |
| `relay/leaderboard-cache.js` | 排行榜 5 分钟缓存 |
| `relay/player-data.js` | 玩家等级与经验 |
| `relay/broadcast.js` | 房间广播 |

部署时 `deploy/quiz-live-relay.ps1` 会上传 `quiz-ws-relay.js` 与 `relay/*.js`。
