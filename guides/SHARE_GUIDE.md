# Share Lock · 对外单页分享

主 deck 通过 URL 参数 `?share=<slug>` 打开**某一页**并禁用翻页导航，无需维护独立 HTML。

## 部署后如何分享

1. 运行 `deploy\sync.bat` 将整站上传到腾讯云 COS（配置见 `deploy\sync.env`）。
2. 在 COS 控制台为该存储桶开启**静态网站**托管，记下访问域名（形如 `https://<桶名>.cos-website.<地域>.myqcloud.com` 或已绑定的自定义域名）。
3. 对外发送单页链接：

```text
https://你的域名/index.html?share=<slug>
```

示例（薪资互动页）：

```text
https://你的域名/index.html?share=salary-cn-us
```

| 行为 | 说明 |
|------|------|
| 打开 | 自动定位到 `share-pages.json` 中登记的 slide |
| 锁定 | 无左右箭头、页码、进度条、滚轮翻页、Esc / 方向键翻页 |
| 保留 | 页内互动（ECharts、Tab、图例、对对碰等）正常 |
| 失败 | slug 未登记或 `section id` 不存在时显示错误页 |

`?page=<slug>` 与 `?share=<slug>` 等价。

## 注册表 `share-pages.json`

| 字段 | 说明 |
|------|------|
| `slideId` | HTML `<section id="…">`，必须存在 |
| `title` | 可选，覆盖浏览器 `<title>` |

完整 slug 列表见 [`share-pages.json`](share-pages.json)（与每页 `id` 一致）。

## 新增可分享页

1. 给目标 leaf `<section>` 加稳定 **`id`**（建议与 slug 相同，kebab-case）
2. 在 **`share-pages.json`** 的 `pages` 中登记 `"slug": { "slideId": "…", "title": "…" }`
3. 对外链接：`index.html?share=<slug>`

## 锁定项

- Reveal `controls` / `progress` / `slideNumber` / `keyboard` / `touch` / `overview`
- `SlideWheelNav`、`SlideProgress`、讲者 Notes 插件
- `navigateToSlide`（案例卡、`data-goto` 议程等）
- 若仍离开目标页，`slidechanged` 会拉回

## 实现文件

- `scripts/share-lock.js` — 解析参数、改 Reveal 配置、锁定
- `scripts/main.js` — 启动前 `ShareLock.init()`，条件跳过 deck 导航模块

## 本地预览

```bat
.\start-lan-server.bat
```

```text
http://localhost:8080/index.html?share=salary-cn-us
```
