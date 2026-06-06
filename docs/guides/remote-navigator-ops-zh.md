# 本地远程翻页操作指南

局域网翻页笔：笔记本投屏演示，手机在同一 WiFi 下遥控翻页。

---

## 事前准备（做一次即可）

在演示用的笔记本上确认：

1. 已安装 **Node.js** 和 **Python 3**
2. 项目文件夹 `Project` 已在笔记本本地（含 `remoteNavigator/` 目录）
3. **Windows 防火墙**：首次启动若弹窗，选择「允许访问」（专用网络 / 局域网）

改完 `index.html` 后、正式演示前，可更新导航文件（一般现场不必做）：

```bat
node remoteNavigator/scripts/generate-deck-nav.js
```

---

## 现场三步

### ① 笔记本和手机连同一个 WiFi

- 不要使用「仅笔记本连手机热点、手机自己用流量」这类组合
- 若需用手机热点，应让**笔记本也连该热点**
- 公司 / 酒店 WiFi 若禁止设备互访，请换网络或改用手机热点

### ② 双击启动服务

```
Project\remoteNavigator\start-remote-server.bat
```

脚本会自动：

- 启动 WebSocket 中继（翻页同步）
- 启动 HTTP 服务（8080 端口）
- 在浏览器打开主讲页 `presenter.html`

**启动后弹出的黑色命令行窗口不要关闭**，关闭即断线。

### ③ 手机扫码连接

1. 在主讲页右上角点击 **「手机连接」**
2. 用手机扫描 QR 码
3. 手机页显示 **「已连接」** 即可开始遥控

---

## 演示时怎么用

| 操作 | 效果 |
|------|------|
| 手机点 **上一页 / 下一页** | 大屏幻灯片同步翻页 |
| 笔记本键盘方向键翻页 | 手机页码同步更新 |
| 手机点 **章节跳转** | 跳转到对应章节开头 |
| **互动模式** + 方向键 + **✓** | 页内焦点移动并模拟点击（见 [`REMOTE_FOCUS_MAP.md`](REMOTE_FOCUS_MAP.md)） |
| 主讲页点 **全屏** | iframe 全屏（也可在 deck 内按 F11） |

---

## 流程示意

```text
[双击 start-remote-server.bat]
         ↓
[笔记本] presenter.html  ←→  [命令行窗口保持运行]
         ↓ 扫码
[手机]   remote.html
         ↓ 点翻页
[大屏]   幻灯片跟着动
```

---

## 讲者口诀

> **同一 WiFi → 双击 bat → 扫二维码 → 别关黑窗口**

---

## 常见问题

| 现象 | 处理 |
|------|------|
| 手机一直显示「连接中」 | 确认手机与电脑同一 WiFi；命令行窗口仍在运行；关闭 VPN 后重试 |
| 扫 QR 打不开 | 查看 bat 窗口中的局域网 IP，手机浏览器手动访问：`http://192.168.x.x:8080/remoteNavigator/remote.html?room=房间码`（房间码见主讲页 QR 面板） |
| 已连接但翻页无反应 | 等待 iframe 内幻灯片加载完成；刷新主讲页后重新扫码 |
| 页码与内容不一致 | 运行 `node remoteNavigator/scripts/generate-deck-nav.js` 重新生成导航文件 |

---

## 访问地址参考

启动后，命令行窗口会打印本机局域网 IP，例如：

| 用途 | 地址 |
|------|------|
| 主讲端（笔记本） | `http://localhost:8080/remoteNavigator/presenter.html` |
| 主讲端（局域网） | `http://192.168.x.x:8080/remoteNavigator/presenter.html` |
| 翻页笔（手机） | 扫 QR 码，或 `http://192.168.x.x:8080/remoteNavigator/remote.html?room=XXXXXX` |

---

## 可选习惯

- 将 `start-remote-server.bat` **发送到桌面快捷方式**，现场只点桌面图标
- 提前 5 分钟到场试扫一次码、翻一页，确认 WiFi 设备可互通
- QR 扫码失败时，可将 QR 面板中的完整链接复制到微信，发给自己后点开

---

## 相关文档

- 技术说明与文件结构：[`REMOTE_GUIDE.md`](REMOTE_GUIDE.md)
- 主 deck 分享单页：[`SHARE_GUIDE.md`](SHARE_GUIDE.md)
