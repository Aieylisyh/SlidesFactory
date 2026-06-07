# quiz-live/scripts — 前端与中继

## 浏览器脚本

| 文件 | 职责 |
|------|------|
| `quiz-protocol.js` | WS 消息构造与 URL 解析 |
| `quiz-ws-client.js` | 重连、心跳 |
| `quiz-register-config.js` | 观众登记表单 |
| `quiz-broadcast.js` | 大屏广播队列 UI |
| `quiz-answer-portrait.js` | 观众端竖屏锁定（横屏遮罩 + orientation.lock） |
| `quiz-answer-questions.js` | 题库预加载与缓存（question_cfg + questions_*.json） |
| `quiz-answer-ws.js` | 观众端 WS 层（连接、登记、消息） |
| `quiz-answer-ui.js` | 观众端 UI 层（视图、答题、排行榜） |
| `quiz-answer.js` | 观众端入口（构造函数 + boot） |
| `quiz-admin.js` / `quiz-screen.js` | 控台 / 大屏 |

## Node 中继（`relay/`）

入口：`quiz-ws-relay.js`（`node quiz-live/scripts/quiz-ws-relay.js`）

| 模块 | 职责 |
|------|------|
| `relay/config.js` | 路径、题库加载、常量 |
| `relay/room-store.js` | 房间/参与者、room-state 持久化 |
| `relay/broadcast.js` | 广播文案、里程碑、room_broadcast |
| `relay/message-handlers.js` | hello / register / self_answer / admin |
| `relay/ws-util.js` | WebSocket 帧编解码 |

部署时 `deploy/quiz-live-relay.ps1` 会上传 `quiz-ws-relay.js` 与 `relay/*.js`。
