# 翻页笔公网部署 · COS + Ubuntu + WSS

目标结构：夏校、Presenter 和手机 Remote 静态文件部署在同一个 COS 站点；Ubuntu 轻量服务器只运行 `ws-relay.js`，由已有的 Nginx 或 Caddy 提供 HTTPS/WSS。

> Presenter 与 `summerschool/index.html` 必须同源，否则浏览器不能访问 iframe 内的 Reveal API。

## 1. 先在 Ubuntu 粘贴这些检查命令

这些命令只读取环境，不修改服务器：

```bash
cat /etc/os-release
node --version
npm --version
command -v pm2 || true
pm2 --version 2>/dev/null || true
nginx -v 2>&1 || true
caddy version 2>/dev/null || true
sudo ss -lntp | grep -E ':(80|443|8081)\b' || true
sudo systemctl --no-pager --full status nginx 2>/dev/null | head -n 30 || true
sudo systemctl --no-pager --full status caddy 2>/dev/null | head -n 30 || true
```

把完整输出发回 Codex，即可据此选择 Nginx、Caddy、PM2 或 systemd 的具体部署命令。

## 2. Relay 最小启动测试

把 `remoteNavigator/scripts/ws-relay.js` 放到服务器某个固定目录后：

```bash
node ws-relay.js --host 127.0.0.1 --port 8081
```

另开一个 SSH 窗口：

```bash
curl http://127.0.0.1:8081/
```

应看到 `Deck remote WebSocket relay`。8081 只需监听服务器本机，不建议直接暴露到公网。

## 3. PM2 常驻

若服务器已有 PM2：

```bash
pm2 start ws-relay.js --name sfk-deck-remote -- --host 127.0.0.1 --port 8081
pm2 save
pm2 startup
```

执行 `pm2 startup` 后，再复制执行它打印出的那条 `sudo ...` 命令。命令依据 [PM2 Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/) 与 [PM2 Startup](https://pm2.keymetrics.io/docs/usage/startup/)。

## 4. Nginx WSS 反向代理示例

在已有 HTTPS 域名的 `server {}` 内加入：

```nginx
location /deck-remote {
    proxy_pass http://127.0.0.1:8081;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 75s;
}
```

然后检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

WebSocket 反向代理需要显式传递 `Upgrade` 与 `Connection` 头，参见 [Nginx 官方 WebSocket proxying](https://nginx.org/en/docs/http/websocket.html)。

## 5. 配置静态站

编辑并随静态站上传 `remoteNavigator/remote-config.js`：

```js
window.DeckRemoteConfig = Object.assign({
  wsUrl: 'wss://ws.sska.site/deck-remote',
  remoteUrl: 'https://sska.site/sfkdoc/remoteNavigator/remote.html?v=20260715'
}, window.DeckRemoteConfig || {});
```

这里没有密码或私钥；会话令牌由 Presenter 每次运行时随机生成。

## 6. 验收

1. 电脑打开 COS 上的 `remoteNavigator/presenter-summerschool.html`。
2. 主讲端状态应显示“已连接中继”。
3. 手机使用不同网络扫码，只允许第一台手机进入。
4. 验证上一页/下一页。
5. 到最后一页验证显示骰子、开始投掷、停止并结算、隐藏骰子。
6. 刷新同一手机，确认能重连；用第二台手机扫码，确认提示“已有一台主持人手机连接”。

## 7. 本项目定向发布

当前工作区若还有其他未确认改动，不要运行全量 `sync.ps1`。只发布夏校 Ice Break 与翻页笔相关静态文件：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy\sync-deck-remote.ps1 -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy\sync-deck-remote.ps1
```

脚本使用已有 `deploy/sync.env` 与 COS 配置，逐文件上传白名单内容，不删除远端文件，也不上传 Relay、测试或其他工作区改动。
