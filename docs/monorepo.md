# Monorepo 架构

本仓库是 **静态 Reveal.js 幻灯片 Monorepo**：一个 git 仓库、多个可独立部署的站点，共享样式 hub 与部分 JS。

## 站点一览

| 站点 | 入口 | 说明 |
|------|------|------|
| **主 deck（就业）** | [`index.html`](../index.html) | 数字娱乐技术就业主题，完整交互 |
| **夏校** | [`summerschool/index.html`](../summerschool/index.html) | USC × 游研社说明会，独立 outline 与橙白主题 |
| **远程翻页** | [`remoteNavigator/`](../remoteNavigator/) | Presenter + Remote 双端 WebSocket 控制 |

详见 [`sites/README.md`](../sites/README.md)。

## 目录约定

```text
Project/
├── index.html              # 主 deck 入口
├── style_guide.css         # CSS hub（@import 分片）
├── styles/style-guide/     # 01–10 模块化样式
├── shared/scripts/         # 跨站点 JS（进度条、滚轮、竖屏）
├── scripts/                # 主 deck 专用 JS
├── assets/                 # 运行时图片（压缩后）
├── data/                   # 主 deck 数据（如 salary.json）
├── guides/                 # 说明类 Markdown 归档
├── contents/               # 源素材（PDF 等），抽图 → assets/
├── summerschool/           # 夏校站点（自有 scripts/、style_extension.css）
├── remoteNavigator/        # 远程翻页（自有 WS 协议与 UI）
├── deploy/                 # COS 同步
└── docs/                   # 文档索引（说明规范见 guides/）
```

## 共享层（`shared/`）

以下脚本被 **主 deck** 与 **summerschool** 引用，修改后需同步 bump `?v=`：

| 文件 | 职责 |
|------|------|
| `shared/scripts/slide-progress.js` | 底部 S 进度条、拖拽吸附 |
| `shared/scripts/slide-wheel-nav.js` | 滚轮双 tick 翻页 |
| `shared/scripts/portrait-deck-adapt.js` | 竖屏检测、`html.deck-portrait`、横屏提示 |

主 deck 专用逻辑保留在 `scripts/`（案例配对、薪资 ECharts、转场 FX 等）。

## 样式管线

HTML **只链一条** `style_guide.css`。Hub 按序 `@import`：

| 分片 | 内容 |
|------|------|
| `01`–`08` | 主主题模块（token、案例、就业、转场等） |
| `09-deck-light-extension.css` | 主 deck 浅色主题（`html.deck-light`） |
| `10-portrait-adapt.css` | 竖屏通用覆盖（`html.deck-portrait`） |

**夏校**额外加载：

- `summerschool/style_extension.css` — `html.ss-deck-light` 橙白主题
- `summerschool/portrait-deck-adapt-extension.css` — 夏校竖屏特例

原根目录 `style_extension.css`、`portrait-deck-adapt.css` 已并入 `09` / `10`，不再单独引用。

## 数据

| 文件 | 用途 |
|------|------|
| `data/salary.json` | 主 deck 薪资图数据源 |
| `contents/data/salary.json` | 内容策划副本（与主 deck 同步维护） |
| `summerschool/data/*.json` | 夏校课表与 i18n |

## 部署

`deploy/sync.ps1` 将 **仓库根目录** 1:1 上传到 COS 前缀（见 `deploy/sync.env.example` 的 `PREFIX`）。

- 本地预览：`start-lan-server.bat`（LAN）或 `start-local-server.bat`
- 远程翻页：`remoteNavigator/start-remote-server.bat`

## 维护原则

1. **改 CSS**：编辑 `styles/style-guide/NN-*.css`，递增 `style_guide.css?v=`。
2. **改共享 JS**：编辑 `shared/scripts/`，各站点 HTML 递增对应 `?v=`。
3. **改主 deck 交互**：编辑 `scripts/`，仅 `index.html` 引用。
4. **新站点**：复用 `style_guide.css` + `shared/scripts/`，站点目录放自有 `index.html` 与扩展 CSS/JS。

完整文档索引：[docs/README.md](../docs/README.md) · 说明文档：[guides/README.md](../guides/README.md)。
