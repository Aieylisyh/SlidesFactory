# 翻页笔 · Remote Navigator

独立于主 deck 的手机翻页遥控方案。主讲端通过 iframe 加载原 deck 并桥接 Reveal API；夏校 `ice-break` 页额外支持远程显示/隐藏骰子与开始/停止投掷。

## 文件结构

```
remoteNavigator/
├── remote-config.js          # 公网 WSS / 手机页地址（非秘密配置）
├── deck-nav.json              # 导航文件（由脚本生成）
├── presenter.html             # 笔记本主讲端（iframe + QR）
├── remote.html                # 手机遥控页
├── start-remote-server.bat    # 启动 HTTP:8080 + WS:8081
├── scripts/
│   ├── generate-deck-nav.js   # 从 index.html 生成 deck-nav.json
│   ├── ws-relay.js            # WebSocket 中继
│   ├── protocol.js            # 消息协议
│   ├── ws-client.js           # 浏览器 WS 客户端
│   ├── presenter-bridge.js    # 主讲端 Reveal 桥接
│   ├── focus-profiles.js      # Focus Profile 检测与静态 target 模板
│   └── remote-ui.js           # 手机 UI
└── tests/
    └── ws-relay.test.mjs      # 令牌、单手机与消息路由测试
```

说明文档：[`docs/guides/REMOTE_GUIDE.md`](REMOTE_GUIDE.md) · 互动焦点：[`docs/guides/REMOTE_FOCUS_MAP.md`](REMOTE_FOCUS_MAP.md)

## 快速开始

### 1. 生成导航文件

改完 `index.html` 后运行：

```bat
node remoteNavigator/scripts/generate-deck-nav.js
```

可选指定 deck（默认 `index.html`）：

```bat
node remoteNavigator/scripts/generate-deck-nav.js --deck index.html
```

### 2. 启动服务

双击项目根目录下的：

```bat
remoteNavigator\start-remote-server.bat
```

或从项目根目录：

```bat
node remoteNavigator/scripts/ws-relay.js
python -m http.server 8080 --bind 0.0.0.0
```

公网服务器应改用 `--host 127.0.0.1 --port 8081`，让 8081 仅接受本机 Nginx/Caddy 转发；局域网模式仍默认监听 `0.0.0.0`。

### 3. 连接

1. 笔记本打开 `http://localhost:8080/remoteNavigator/presenter.html`
2. 点击右上角 **手机连接**，显示 QR 码与房间码
3. 手机扫码打开 `remote.html`；局域网模式需同一 WiFi，公网 WSS 模式可处于不同网络
4. 手机点 **上一页 / 下一页**，大屏跟随；大屏键盘翻页，手机同步
5. **互动模式**：方向键在页内焦点间移动，**✓** 模拟点击（见 [`REMOTE_FOCUS_MAP.md`](REMOTE_FOCUS_MAP.md)）
6. 到 `ice-break` 页后，手机自动显示 **显示/隐藏骰子** 与 **开始投掷/停止并结算** 两个按钮

## 导航文件 `deck-nav.json`

| 字段 | 说明 |
|------|------|
| `slides[].index` | 线性页码（0 起） |
| `slides[].h`, `v` | Reveal 坐标 |
| `slides[].id` | `<section id>` |
| `slides[].title` | 来自 `config/share-pages.json` |
| `chapters[]` | 来自 [`../config/outline.md`](../config/outline.md) 议程表 |

## URL 参数

**主讲端** `presenter.html`：

| 参数 | 说明 |
|------|------|
| `room` | 6 位房间码（省略则自动生成） |
| `deck` | deck 路径，默认 `../index.html` |

**遥控端** `remote.html`：

| 参数 | 说明 |
|------|------|
| `room` | 必填，与主讲端一致 |
| `deck` | 可选，deckId 校验 |

主讲端与手机端均支持 `ws` 参数覆盖 WebSocket 地址；生产环境优先配置 `remoteNavigator/remote-config.js`：

```js
window.DeckRemoteConfig = {
  wsUrl: 'wss://remote.example.com/deck-remote',
  remoteUrl: 'https://static.example.com/remoteNavigator/remote.html'
};
```

## 通信协议

WebSocket 地址：`ws://<主机>:8081`

```json
{ "type": "hello", "role": "presenter|remote", "room": "ABC123", "deckId": "index", "token": "…", "clientId": "…" }
{ "type": "state", "index": 12, "h": 12, "v": 0, "id": "case-cui", "title": "…" }
{ "type": "cmd", "action": "next|prev|goto", "h": 12, "v": 0, "id": "…" }
{ "type": "cmd", "action": "focus_mode", "enabled": true }
{ "type": "cmd", "action": "focus_move", "dir": "up|down|left|right" }
{ "type": "cmd", "action": "focus_confirm" }
{ "type": "cmd", "action": "dice_show|dice_hide|dice_roll_start|dice_roll_stop" }
{ "type": "ack", "index": 12 }
{ "type": "request_state" }
```

`state` / `ack` 可附带 `focus` 对象（见 [`REMOTE_FOCUS_MAP.md`](REMOTE_FOCUS_MAP.md) §6），也可附带 `interaction`：

```json
{ "interaction": { "kind": "ice-break", "ready": true, "visible": true, "rolling": false } }
```

## 公网安全模型

- Presenter 生成 24 字节随机令牌，二维码将令牌放在 URL fragment 中，不进入静态站访问日志。
- Relay 只接受令牌匹配的手机，并按角色限制 `cmd`、`state` 与 `request_state`。
- 每个房间只允许一个 Remote `clientId`；同一手机可替换旧连接完成重连，其他手机收到 `room_busy`。
- 浏览器客户端每 20 秒发送应用层心跳，避免反向代理空闲断开。
- 公网连接必须使用 WSS；Node relay 继续监听本机 HTTP/WS 端口，由 Nginx/Caddy 终止 TLS。

Ubuntu、PM2、Nginx 与 COS 配置见 [`REMOTE_PUBLIC_DEPLOY.md`](REMOTE_PUBLIC_DEPLOY.md)。

## 排错

| 现象 | 处理 |
|------|------|
| 手机显示「连接中」 | 确认 `ws-relay.js` 在跑、防火墙放行 8081 |
| 公网页面报连接失败 | 检查 `remote-config.js` 的 `wss://` 地址、TLS 证书与反向代理 Upgrade 头 |
| 提示「已有一台主持人手机连接」 | 关闭旧手机页面，等旧 WebSocket 断开后重新扫码 |
| 提示「授权无效」 | 返回主讲端重新打开 QR 面板并扫码，不要只输入房间码 |
| 翻页无反应 | 主讲端 iframe 内 Reveal 须就绪；看浏览器控制台 |
| 页码不对 | 重新运行 `generate-deck-nav.js` |
| QR 打不开 | 手机须与电脑同一 LAN，勿用 `--bind 127.0.0.1` |

## 与主站关系

- **零侵入**：不改 `index.html`、`scripts/main.js` 及 `scripts/core/*` 启动链
- **Share Lock**（`?share=`）在 iframe 内仍生效；若需完整 deck 遥控，请用无 `?share=` 的 URL
- 竖屏 deck 适配（`portrait-deck-adapt`）在 iframe 内照常工作
