# Monorepo 架构

本仓库是 **静态 Reveal.js 幻灯片 Monorepo**：一个 git 仓库、多个可独立部署的站点，共享样式 hub 与部分 JS。

## 三层模型

```text
[站点层]   index.html · summerschool/ · quiz-live/ · remoteNavigator/
[包层]     styles/ · shared/ · scripts/（主 deck 交互）
[工程层]   config/ · tools/ · docs/ · contents/ · deploy/
```

| 层级 | 目录 | 是否部署到 COS |
|------|------|----------------|
| 站点 | `index.html`、`summerschool/`、`quiz-live/`、`remoteNavigator/`、`assets/`、`data/` | ✅ |
| 包 | `styles/`、`shared/`、`scripts/`、`style_guide.css`、`config/share-pages.json` | ✅（`*.md` 除外） |
| 工程 | `tools/`、`docs/`、`contents/`、`deploy/`、`AGENTS.md`、`.codex/`、`.cursor/`、`config/outline.md` | ❌ |

## 站点一览

| 站点 | 入口 | 说明 |
|------|------|------|
| **主 deck（就业）** | [`index.html`](../index.html) | 数字娱乐技术就业主题，完整交互 |
| **夏校** | [`summerschool/index.html`](../summerschool/index.html) | USC × 游研社说明会，独立 outline 与橙白主题 |
| **暖场抢答** | [`quiz-live/`](../quiz-live/) | 观众/控台/大屏 + relay（**已封存**，见 [`ARCHIVED.md`](../quiz-live/ARCHIVED.md)） |
| **远程翻页** | [`remoteNavigator/`](../remoteNavigator/) | Presenter + Remote 双端 WebSocket 控制 |

详见 [`sites.md`](sites.md)。

## 根目录约定

```text
Project/
├── index.html              # 主 deck 入口（URL 固定）
├── style_guide.css         # CSS hub（@import 分片）
├── start-lan-server.bat    # → tools/dev/ 转发
├── config/                 # 主 deck 配置（outline、分享注册表）
├── styles/style-guide/     # 01–11 模块化样式
├── shared/scripts/         # 跨站点 JS（进度条、滚轮、竖屏）
├── scripts/                # 主 deck 专用 JS（按模块分子目录）
├── assets/                 # 运行时图片（压缩后）
├── data/                   # 主 deck 运行时数据（deploy 时从 contents/data 复制）
├── contents/               # 源素材（PDF 等），不部署
├── tools/                  # Python 脚本、本地 dev server、设计预览
├── docs/                   # 文档索引 + guides 规范
├── deploy/                 # COS / relay 部署
├── AGENTS.md               # Agent 工作入口
├── .codex/                 # Codex rules / skills（不部署）
├── .codexignore            # Codex 上下文忽略清单
├── summerschool/           # 夏校站点
├── quiz-live/              # 暖场抢答（已封存，活跃开发见 QuizOnlineGame）
└── remoteNavigator/        # 远程翻页
```

## 共享层（`shared/`）

以下脚本被 **主 deck** 与 **summerschool** 引用，修改后需同步 bump `?v=`：

| 文件 | 职责 |
|------|------|
| `shared/scripts/slide-progress.js` | 底部 S 进度条、拖拽吸附 |
| `shared/scripts/slide-wheel-nav.js` | 滚轮双 tick 翻页 |
| `shared/scripts/portrait-deck-adapt.js` | 竖屏检测、`html.deck-portrait`、横屏提示 |
| `shared/scripts/deck-focus-nav.js` | 远程翻页焦点导航（Presenter 注入） |

主 deck 专用逻辑在 `scripts/`（见 [`scripts/README.md`](../scripts/README.md)）。

## 主 deck 脚本（`scripts/`）

| 子目录 | 内容 |
|--------|------|
| `core/` | `deck-viewport.js`、`deck-nav.js`、`deck-slide-host.js`、`deck-reveal.js`、`main.js` |
| `portfolio/` | mesh 网格、作品集轴 |
| `cases/` | 案例配对、聊天 lightbox、B 站 embed |
| `employment/` | 薪资 ECharts、国产现象页 |
| `chrome/` | 转场 FX、分段箭头、分享锁、点击 VFX |
| `major/` | 专业方向 picker |

**quiz-live** 脚本见 [`quiz-live/scripts/README.md`](../quiz-live/scripts/README.md)（含 `relay/` WebSocket 模块；**已封存**，活跃开发见 QuizOnlineGame）。

## 样式管线

HTML **只链一条** `style_guide.css`。Hub 按序 `@import` 01–10（其中 04→04a–04c、05→05a–05b）；quiz-live 独立加载 11。

**夏校**额外加载 `summerschool/style_extension.css`（hub → `summerschool/css/ss-*.css`）+ `portrait-deck-adapt-extension.css`。

## 配置（`config/`）

| 文件 | 用途 |
|------|------|
| `config/outline.md` | 主 deck 页序与结构（开发用，不部署） |
| `config/share-pages.json` | 分享锁 slug 注册表（**运行时 fetch，需部署**） |

## 数据

| 文件 | 用途 |
|------|------|
| `data/salary.json` | 主 deck 薪资图数据源（deploy 用） |
| `contents/data/salary.json` | **策划编辑入口**（sync 时自动复制到 `data/`） |
| `summerschool/data/*.json` | 夏校课表与 i18n |

## 工具（`tools/`）

| 路径 | 用途 |
|------|------|
| `tools/dev/` | LAN / localhost HTTP 预览 |
| `tools/python/` | 图片压缩、PDF 抽图、CSS 分片脚本 |
| `tools/design/` | Figma 对照预览页 |

## 部署

`deploy/sync.ps1` 将 **仓库根目录** 1:1 上传到 COS 前缀（见 `deploy/sync.env.example` 的 `PREFIX`）。排除 `tools/`、`docs/`、`contents/`、`deploy/`、`.codex/`、`.cursor/` 与根目录 Agent 配置。

- 本地预览：根目录 `start-lan-server.bat`（转发至 `tools/dev/`）
- 远程翻页：`remoteNavigator/start-remote-server.bat`

## 维护原则

1. **改 CSS**：编辑 `styles/style-guide/NN-*.css`，递增 `style_guide.css?v=`。
2. **改共享 JS**：编辑 `shared/scripts/`，各站点 HTML 递增对应 `?v=`。
3. **改主 deck 交互**：编辑 `scripts/` 对应子目录，递增 `index.html` 脚本 `?v=`。
4. **改 deck 结构**：先改 `config/outline.md`，再改 `index.html`。
5. **新站点**：复用 `style_guide.css` + `shared/scripts/`，站点目录放自有 `index.html` 与扩展 CSS/JS。

完整文档索引：[docs/README.md](README.md) · 规范文档：[docs/guides/README.md](guides/README.md)。
