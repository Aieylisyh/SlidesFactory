# Bilibili Embed · 站内外链播放器嵌入

> 在 Reveal 幻灯片内全屏（或大块区域）播放 B 站视频。  
> 实现：`scripts/bilibili-embed.js` · 样式：`styles/style-guide/04-cases-interactive.css`（`.slide-cui-tfe-video`、`.bilibili-embed-*`）· 挂载：`scripts/main.js` · 参考页：`#/case-cui-tfe-video`（崔同学 TFE 演示视频）

---

## 何时使用

- 案例页需要**现场播放** B 站上的展示片 / 宣传片，且视频已有公开 `bvid`
- 不适合：必须展示 B 站完整页面 UI（评论、推荐侧栏、UP 主空间等）——见下文「不能做什么」

---

## 不能做什么（CRITICAL）

| 做法 | 结果 |
|------|------|
| `<iframe src="https://www.bilibili.com/video/BV…">` 嵌入**主站页面** | **失败**。B 站通过 `Content-Security-Policy: frame-ancestors` 禁止被第三方页面嵌套，iframe 内为空白或报错 |
| `<video src="…bilibili…">` 直接播流 | **不可行**。无公开直链，且违反使用条款 |
| 离线播放 | **不可行**。播放器与 CDN 均依赖互联网（与 Reveal.js CDN 相同） |

**可行方案**：仅使用 B 站官方**站外播放器**  
`https://player.bilibili.com/player.html?bvid=BV…`

播放器内**不显示**播放量、点赞、评论等页面信息。播放量等数据需：

1. 在幻灯片文案中手写兜底（推荐），或  
2. 由脚本尝试请求开放 API 更新（可能因 CORS 失败，见 §6），或  
3. 提供「在 B 站打开完整页面」外链，新标签查看完整 UI

---

## 架构与文件

| 文件 | 职责 |
|------|------|
| `scripts/bilibili-embed.js` | 翻页时 `mount` / `unmount` iframe；可选拉取播放量 |
| `scripts/main.js` | `initBilibiliEmbed()`、`teardownBilibiliEmbed()`；`slidechanged` 时卸载上一页 |
| `styles/style-guide/04-cases-interactive.css` | `.slide-cui-tfe-video`、`.bilibili-embed-frame` 等全屏布局 |
| `index.html` | `<script src="scripts/bilibili-embed.js?v=…">` 须在 `main.js` **之前** |

全局对象：`window.BilibiliEmbed` → `{ initSlide, teardownSlide }`

---

## Slide 标记

在 `<section>` 上声明 `bvid`（从视频 URL `…/video/BV1UM4m1o7S3` 提取）：

```html
<section
  id="case-cui-tfe-video"
  class="content-slide slide-cui-tfe-video"
  data-background-color="#000"
  data-bilibili-embed="BV1UM4m1o7S3">
```

| 属性 / 类 | 说明 |
|-----------|------|
| `data-bilibili-embed` | **必填**。B 站 `bvid`，脚本据此拼播放器 URL |
| `.content-slide` | 统一内容页；首子元素 `h2` 参与 `fitSlidePageTitles()` |
| `.slide-cui-tfe-video` | 本页版式：标题 + 元信息条 + 弹性播放器区域 |
| `id` | 可选；便于 `#/case-cui-tfe-video` 深链 |

---

## HTML 骨架

```html
<section class="content-slide slide-cui-tfe-video" data-background-color="#000" data-bilibili-embed="BVxxxxxxxxxx">
  <div class="slide-content-layer">
    <h2>页面标题</h2>

    <!-- 可选：播放量 / 点赞 + 外链 -->
    <div class="bilibili-embed-meta case-body-sm" data-bilibili-meta>
      <span data-bilibili-view>播放 7.5 万+</span>
      <span class="bilibili-embed-meta-sep" aria-hidden="true">·</span>
      <span data-bilibili-like>点赞 2900+</span>
      <a class="bilibili-embed-link"
         href="https://www.bilibili.com/video/BVxxxxxxxxxx"
         target="_blank" rel="noopener noreferrer">在 B 站打开完整页面</a>
    </div>

    <!-- 播放器挂载点：初始为空，由 JS 注入 iframe -->
    <div class="bilibili-embed-frame interactive-zone" data-bilibili-frame></div>
  </div>
  <aside class="notes">讲者备注…</aside>
</section>
```

要点：

- **`data-bilibili-frame` 内不要手写 iframe`** — 懒加载由脚本创建，避免离屏页预载视频
- **`data-bilibili-meta` 内保留静态兜底文案** — API 失败时仍有可读数据
- **外链 `href` 使用真实、已核实的 `bvid` URL** — 遵守「零假链接」规则

---

## 核心技术点

### 1. 站外播放器 URL

```text
https://player.bilibili.com/player.html?aid={AID}&bvid={BVID}&cid={CID}&p=1&danmaku=0&autoplay=0&as_wide=1&high_quality=1&quality=80&try_look=1
```

脚本内常量：`PLAYER_BASE`（`bilibili-embed.js` → `buildSrc()`）

| 参数 | 本项目默认 | 说明 |
|------|------------|------|
| `bvid` | 必填 | 视频 BV 号；与 `aid` 成对更稳 |
| `aid` / `cid` | API 拉取 | 由 `fetchVideoMeta()` 写入，提升外链播放器稳定性 |
| `p` | `1` | 多 P 分集（官方参数名） |
| `danmaku` | `0` | 关闭弹幕，演示现场更干净 |
| `autoplay` | `0` | 不自动播放；浏览器也常拦截无交互自动播放 |
| `as_wide` | `1` | 宽屏模式 |
| `high_quality` | `1` | 请求较高画质（旧版播放器；与 `quality` 叠加） |
| `quality` | `80` | qn 码：**80 = 1080P**，**64 = 720P**（至少 HD 用 64+） |
| `try_look` | `1` | 尝试在未登录外链场景拉更高清流（受 B 站策略限制） |

**为何曾出现 360P / 模糊**

1. 仅 `bvid` + `high_quality=1` 在新版外链播放器上**不一定生效**，缺 `as_wide` / `quality` / `aid+cid` 时易默认 360P。  
2. Reveal 缩放：iframe 在容器 **尚未 layout 到实际像素尺寸** 时初始化，播放器会按小尺寸选低清码流。本仓库已在 `mount` 中 **延迟到 layout 就绪** 再设 `src`。  
3. 未登录时 B 站仍可能 cap 在 480P–720P；1080P 需源片支持且非大会员专享。

其他常用参数（按需追加到 `buildSrc()`）：

| 参数 | 说明 |
|------|------|
| `p` | 多 P 视频分集，从 1 起 |
| `t` | 起始秒数 |
| `muted` | `1` 静音（若将来需要自动播放可配合使用） |

官方说明：<https://player.bilibili.com/>

### 2. 翻页懒加载（mount / unmount）

```
进入含 data-bilibili-embed 的 slide
  → BilibiliEmbed.initSlide(slide)
  → 创建 iframe（若不存在）并设置 src
  → 可选 fetchMeta(bvid)

离开该 slide（slidechanged）
  → BilibiliEmbed.teardownSlide(previousSlide)
  → iframe.removeAttribute('src')  // 停止播放、释放资源
```

**为何卸载 `src`**：Reveal 线性 deck 会预渲染相邻页；若所有视频页常驻 `src`，会同时占用带宽与解码资源。

### 3. `main.js` 挂钩

- `initSlideModules()` 末尾调用 `initBilibiliEmbed(slide)`
- `Reveal.on('slidechanged')` 先 `teardownBilibiliEmbed(event.previousSlide)`，再 `initSlideModules(event.currentSlide)`
- 首屏若即为视频页：`bootCurrentSlideModules()` 会触发一次 `initSlide`

### 4. 全屏布局 CSS

播放器容器使用 **flex 子项 + `min-height: 0`**，在固定 1920×1080/1200 slide 内占满标题以下区域：

```css
.reveal .slide-cui-tfe-video .slide-content-layer {
  justify-content: flex-start;
  align-items: stretch;
  gap: 10px;
}

.reveal .slide-cui-tfe-video .bilibili-embed-frame {
  flex: 1;
  min-height: 0;
  position: relative;
}

.reveal .slide-cui-tfe-video .bilibili-embed-frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
```

新增视频页可复制 `.slide-cui-tfe-video` 规则，或抽成通用 `.slide-bilibili-embed`（改 CSS 时同步 `style_guide_extended.md`）。

### 5. 播放量元数据（可选）

脚本请求：

```text
GET https://api.bilibili.com/x/web-interface/view?bvid={BVID}
```

成功时更新 `[data-bilibili-view]`、`[data-bilibili-like]`。  
**注意**：该接口**不一定**返回 `Access-Control-Allow-Origin`，从 `localhost` / LAN 预览时 `fetch` 可能被浏览器 CORS 拦截；此时保留 HTML 静态兜底即可，属预期行为。

---

## 互动区与翻页

`.bilibili-embed-frame` 带 `.interactive-zone`：

- **可以**在**本页其他**按钮 / 控件上拦截 pointer、键盘（Space、方向键），避免误触 Reveal 翻页
- **禁止**在子节点上拦截 `wheel` — 见 `WHEEL_NAV_GUIDE.md`
- **iframe 内部**的点击、键盘由 B 站播放器接管，父页面无法 `stopPropagation`；一般不影响横向翻页

播放器外壳无需额外 `wheel` 处理。

---

## 注意事项清单

1. **联网**：演示机与观众设备需能访问 `player.bilibili.com`（及 B 站 CDN）
2. **预览方式**：用 `start-lan-server.bat` / `start-local-server.bat`，勿 `file://` 打开
3. **缓存**：改 `bilibili-embed.js` 后递增 `index.html` 中 `?v=`
4. **结构**：新视频页先更新 `outline.md`，再改 `index.html`
5. **iframe 政策**：项目默认避免 iframe；仅在有明确演示需求时使用本指南方案
6. **版权与授权**：嵌入公开视频前确认案例/学员已同意在路演中播放
7. **多视频**：每页一个 `data-bilibili-embed`；多视频用多页，依赖懒加载控制负载
8. **深链**：建议给 `<section>` 设唯一 `id`，方便 `#/your-slide-id` 排练跳转
9. **讲者备注**：操作说明、话术放在 `<aside class="notes">`，不要堆在画面上

---

## 新增一页视频 · 检查清单

- [ ] 从 URL 复制正确 `bvid`（如 `BV1UM4m1o7S3`）
- [ ] `outline.md` 增加页数 / 小节说明
- [ ] 复制 HTML 骨架，改标题、`bvid`、外链、兜底播放量文案
- [ ] 确认 `data-bilibili-frame` 为空容器
- [ ] 需要新版式时扩展 `04-cases-interactive.css` + `style_guide_extended.md`
- [ ] `bilibili-embed.js` 有改动则 bump `?v=`
- [ ] LAN 服务器预览：翻入播放、翻离停止、滚轮仍可翻页
- [ ] 点击「在 B 站打开」确认跳转正确

---

## 调试

1. 硬刷新并确认 `bilibili-embed.js` 版本号已更新
2. 控制台无 `BilibiliEmbed is not defined` → 脚本顺序是否在 `main.js` 之前
3. 进入视频页后 Elements 面板中 `data-bilibili-frame` 内应有 `iframe`，且 `src` 含 `player.bilibili.com`
4. 离开页面后 `iframe` 的 `src` 应被移除
5. 播放器空白：检查网络、广告拦截插件、B 站地域限制
6. 播放量未刷新：多为 CORS；检查静态兜底文案是否已写
7. 滚轮翻页失效：检查是否在互动区误绑了 `wheel` 的 `stopPropagation`

---

## 参考

- 官方站外播放器：<https://player.bilibili.com/>
- 项目内参考实现：`index.html` → `#case-cui-tfe-video`
- 滚轮约定：`WHEEL_NAV_GUIDE.md`
- 组件索引：`style_guide_extended.md`（`.slide-cui-tfe-video`）
