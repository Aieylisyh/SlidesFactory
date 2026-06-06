# Presentation Design System — Extended Components



> 本文档为 `style_guide.md` 的**组件索引**；转场详见 **`transition_guide.md`**。  

> 所有类均在 `styles/style-guide/*.css` 分片中实现，经根目录 `style_guide.css` 聚合加载。  
> **按模块找文件**：见本文 §CSS Architecture 或 [`../styles/style-guide/README.md`](../styles/style-guide/README.md)。



---



## 0. 品牌色 Token（Logo 衍生）

| Token | Hex | 说明 |
|-------|-----|------|
| `--sfk-magenta` | `#C82464` | SFK 主标填充 — 表头、下划线、`.accent-pink` |
| `--sfk-magenta-light` | `#E05688` | 同色相浅 tint — 双栏 B 侧、`.accent-orange` |
| `--sfk-magenta-dark` | `#961848` | 印章 / 深压 |
| `--sfk-pink` / `--sfk-orange` | 上列 alias | HTML 类名不变，**orange 已非橙色** |

Canvas 脚本（`grid-morph.js`、`surround-mesh-grid.js`）中的 `rgba(200,36,100,…)` / `rgba(224,86,136,…)` 与上表对应。



---



## 1. 背景与 Canvas



| 类名 | 用途 |

|------|------|

| `#global-bg-canvas` | 全局固定网格变形背景，opacity ≈ 0.22 |

| `.slide-bg-canvas-host` | 单页内嵌 Canvas 容器（章节开篇等） |

| `data-mesh-preset="employment"` | 就业章节开篇轻量 mesh |

| `data-mesh-preset="teal"` | 时下热点页；`--sfk-teal` (#00C896) 网格 |

| `data-mesh-chip-attract` | 兴趣标签页：鼠标靠近 chip 时网格聚拢 |



逻辑画布（`scripts/core/deck-viewport.js`）：16:9 → 1920×1080；16:10 → 1920×1200。



---



## 2. 页面类型



| 类名 | 用途 |

|------|------|

| `.title-slide` | 封面；居中 flex + `.cover-brand-image` |

| `.content-slide` | 标准内容页；首个 `h2` 左对齐 + 统一品红下划线（见 `style_guide.md` §4.4） |

| `.section-opener` | 章节开篇；黑底居中标题（**勿用** `.section-header` 全品红块） |

| `.section-header` | 遗留全品红块，新页不用 |

| `.slide-image-full` | 单图 hero 几乎满屏 |

| `.slide-wechat-board` | 微信截图专页；flex 纵向，标题 + 画廊 |

| `.slide-wechat-enlarge` | 截图页加大展示（gallery 占满宽；标题走 §4.4 统一规范） |

| `.slide-case-summary` | 案例对比页（缩小正文） |

| `.slide-case-summary-table-only` | 五位学员对比表独占一页 |



---



## 3. 内容布局



| 类名 | 用途 |

|------|------|

| `.slide-layout-split` | 双栏 1:1 |

| `.slide-layout-split-wide-right` | 左窄右宽 0.9 : 1.1 |

| `.slide-layout-split-wide-left` | 左宽右窄 1.1 : 0.9 |

| `.slide-content-layer` | **每页必选**内容安全区容器 |



---



## 4. 案例模块组件



| 类名 | 用途 |

|------|------|

| `.case-tag` / `.case-tag-orange` | 学员路径标签（主品红 / 浅品红） |

| `.case-tag-row` | 标签横排 |

| `.case-highlight` | 核心结论（白字，`--font-case-highlight`） |

| `.case-body-sm` | 次要说明（小字 muted） |

| `.case-slide-footer` | 截图页底部收束句 |

| `.case-card-grid` / `.case-card` | 五列概览卡片；`.is-active` 选中 |

| `.disclaimer-note` | 授权说明小字 |

| `.case-intro-media` | 案例导读页右侧双图栈 |

| `.case-project-showcase` | 项目展示页（图 + 说明列表） |

| `.case-project-visual-grid` | 项目双图网格（右列上下等） |

| `.case-project-visual-primary` / `-secondary` | 主图 / 次图网格位 |

| `.case-project-notes` | 项目说明 bullet 列表 |

| `.case-summary-table` | 对比表；首列学员名不换行 |



---



## 5. 议程与封面



| 类名 | 用途 |

|------|------|

| `.agenda-list` / `.active` | 目录列表（旧版）；议程页已改用 `.segment-arrow`（见 `segment_arrow.md`） |

| `.segment-arrow` | 分段横向箭头组件 — **规范见 `segment_arrow.md`** |

| `.agenda-num` | 目录序号（品红，旧版列表用） |

| `.cover-brand-image` | 封面主视觉图 |

| `.brand-footer` | 页脚 SFK 品牌字（`section` 直接子元素） |

| `.slide-brand-logo` | 页角 Logo 容器（`main.js` 注入；右上角贴齐画布、`z-index: 1`；`assets/logos/DMA-logo-black.png`，max 180px） |
| `.slide-page-header` | 内容页标题区可选包裹（`h2` 左对齐 + 品红下划线；见 `style_guide.md` §4.4） |



---



## 6. 图片容器与画廊



### 6.1 容器修饰



| 类名 | 行为 |

|------|------|

| `.tech-image-container` | 基础边框盒 |

| `.fit-shot` / `.fit-shot-large` / `.fit-shot-hero` | 项目/PDF 图 contain |

| `.chat-shot` | 聊天截图 contain，尽量大 |

| `.chat-shot-trim-x` |  intentional 左右各裁 ~4% |

| `.chat-shot-emphasis` | 同排中略放大的一格 |

| `.compact` | 限高 300px cover |

| `.image-placeholder` | 无本地图时的灰底占位 |



### 6.2 网格



| 类名 | 列数 / 布局 |

|------|-------------|

| `.image-grid-2` / `.image-grid-3` | 2 / 3 列 |

| `.image-grid-duo` | 2 图并排（**不要** 4 格空占） |

| `.chat-evidence-grid` | 2×2 或 2 列聊天截图 |

| `.wechat-gallery` | 默认 2 列 |

| `.wechat-gallery-trio` | 3 列 |

| `.wechat-gallery-large` | 提高 max-height |

| `.wechat-gallery-dense` | 多图略缩小 |

| `.wechat-gallery-trio-bias-right` | 三列，右列略宽 |

| `.wechat-gallery-lu-fill` | 卢同学过渡页：左长图 + 右三图分栏填满 |
| `.chat-lu-hero-col` / `.chat-lu-side-col` | 配合 `.wechat-gallery-lu-fill` 左右栏 |
| `.chat-lu-side-row-tall` / `.chat-lu-side-row-mid` / `.chat-lu-side-row-compact` | 右侧三行比例（约 4.2 : 0.36 : 0.28）；上行底部放大 1.2×，中行图高 58% |
| `.chat-lu-shot-crop-header` | 裁掉朋友圈截图顶部头像/昵称区（`transform-origin: bottom`） |

| `.chat-shot-span-full` | 超长图独占一行 |



---



## 7. 交互



| 类名 | 用途 |

|------|------|

| `.interactive-zone` | 须 `stopPropagation`，防 Reveal 抢事件 |

| `.match-game-panel` | 学员—去向配对面板 |

| `.match-game-board` | 配对双栏 |

| `.match-chip` | 可点选配对词条 |

| `.match-chip.is-selected` | 姓名已选中（灰白高亮） |

| `.is-placed` / `.is-matched` / `.is-wrong` | 配对反馈 |

| `.is-punching` / `.click-fx-ripple` | 点击 punch + 单色涟漪（`scripts/click-fx.js`） |

| `.slide-employment-market` + `.employment-hero-chart` | 游戏市场图表页（标题 + 大图，无互动） |

| `.major-pick-panel` | 兴趣标签 → 专业方向建议 |

| `.reveal .progress` + `.is-deck-progress-active` + `.deck-progress-thumb` + `.is-dragging` + `.is-snapping` | 全 deck 底部进度条（**常驻**）：`.progress` 上以 S 为中心的 bar 渐变（两端深灰 → 暗品红过渡 → S 处略亮主题品红峰 `--deck-progress-bar-peak`，峰位 `--deck-progress-thumb-pct`）+ `assets/logos/S.png` 蒙版品红 S 标记；Reveal 填充 `span` 透明；`shared/scripts/slide-progress.js`（v8+）— 拖拽中 thumb 平滑跟随（不跳页），释放 easeOutCubic ~220ms 吸附至最近 slide 后 `Reveal.slide()` |
| `html.deck-portrait` + `.deck-portrait-hint` | 竖屏轻量适配（策略 A）：`shared/scripts/portrait-deck-adapt.js` + `styles/style-guide/10-portrait-adapt.css`；横屏提示条；通用 grid 折叠与安全区；见 `PORTRAIT_ADAPT_GUIDE.md` |

| `.major-pick-chip` / `.major-path-tag` | 兴趣 chip（3 列粗描边圆角矩形）/ 结果标签（无边框、主题品红） |
| `.major-pick-chip.is-punching` | 点选 punch 缩放动画 |
| `.major-pick-chip.is-selected` | 选中态 + 品红光晕 |
| `.major-chip-ripple` | 选中时点击处品红涟漪扩散 |
| `.major-path-tag.is-new` | 新出现方向的弹性弹入 |
| `.portfolio-axis-panel` | 三轴交汇互动（特点 × 院校 × 热点）；`--portfolio-axis-option-font-size` 统一列标题与选项字号 |
| `.portfolio-axis-chip-label` | 选项文案 — 与 `.portfolio-axis-col-label` 同字号、常规字重、水平居中 |
| `.portfolio-axis-chip.is-selected` | 三轴选项选中态 — 特点 `#C12C5C`、院校 `#D9698A`、热点 `#00BFF3`（按 `data-axis` 分色） |
| `.portfolio-axis-formula` / `.portfolio-axis-insight` | 三轴结果：公式行（较小加粗）+ 「作品方向建议」灰色前缀 + 方向文案（较大正文） |
| `.portfolio-axis-insight-label` | 结果区固定灰色前缀「作品方向建议」 |
| `.salary-toggle-bar` / `.salary-toggle-btn.is-active` | 岗位薪资五 Tab 切换（国内大厂 / 游戏开发 / Unreal / Unity / 游戏设计）；标题前缀「国内-」/「美国-」，红字紧贴图表上方 |
| `.slide-employment-salary-echarts` + `[data-salary-echarts]` | 中美薪资 ECharts 互动页：主图 ~72% + 右侧图例 toggle + 时间滑块 + `.sfk-table`；运行时数据 `data/salary.json`（源文件 `contents/data/salary.json`，deploy 时自动复制） |
| `.salary-echarts-panel` / `.salary-echarts-chart` / `.salary-echarts-legend-item` | ECharts 容器、自定义图例（`.is-hidden` 35% 透明度） |
| `.salary-echarts-slider` / `.salary-echarts-play-btn` | 2020–2025 年份滑块与播放；`scripts/employment/salary-echarts.js` |
| `.growth-stage-card.is-expanded` | 成长性时间轴展开态 |
| `.chat-shot-zoomable` | 微信截图 / `[data-image-lightbox]` 内图片可点击放大 |
| `data-image-lightbox` | 页内所有 `.tech-image-container` 启用全屏预览（如崔同学介绍、独立游戏页） |
| `.slide-cui-tfe-video` + `data-bilibili-embed` | 崔同学 TFE 全屏 B 站播放器；`scripts/cases/bilibili-embed.js` 翻页懒加载，`data-bilibili-meta` 展示播放量。详见 `BILIBILI_EMBED_GUIDE.md` |
| `.chat-lightbox-overlay.is-open` | 全屏截图预览层 |
| `.agenda-link-item` | 议程可点击跳转章节 |



脚本：`scripts/chrome/click-fx.js`、`scripts/cases/case-match.js`、`scripts/major/major-picker.js`、`scripts/portfolio/portfolio-axis.js`、`scripts/chrome/segment-arrow.js`、`scripts/employment/salary-toggle.js`、`scripts/employment/salary-echarts.js`、`scripts/cases/chat-lightbox.js`、`scripts/cases/bilibili-embed.js`、`scripts/portfolio/grid-morph.js`、`shared/scripts/slide-wheel-nav.js`（滚轮翻页，见 `WHEEL_NAV_GUIDE.md`）。



---



## 7b. 就业形势 & 选专业模块



| 类名 | 用途 |

|------|------|

| `.slide-employment` / `.slide-major` | 就业 / 选专业内容页 |

| `.employment-hero-chart` | 单张形势大图 |

| `.employment-split-grid` | 左 bullet 右图 |

| `.slide-employment-hits` + `.employment-hit-duo` | 国产重磅双卡对比页（黑神话 / 哪吒）：`.employment-hit-hero` 顶图（16:9 · `object-fit: cover` · 顶对齐）+ `.employment-hit-card-body` 数据区 |

| `.employment-hit-hero` | 卡片顶图容器；`flex: 1` 吃满卡片剩余高度，`min-height: min(32vh, 300px)`；底缘渐变过渡到正文 |

| `.employment-hit-card--film` | 动画电影卡（**主题品红**左边框 / 强调色，与悟空栏 Logo 橙+金区分） |
| `.slide-employment-hits` 悟空栏 | 数字 **Logo 橙 `#F48C48`** / **金 `#E8B040`**（奇偶格交替）；小人同色 |
| `.slide-employment-hits` 哪吒栏 | 数字与装饰 **主题品红** `--sfk-magenta`；小人品红系 |
| 哪吒顶图点击 | 百度百科条目（非豆瓣） |
| `.employment-hit-card-head`（hits） | 仅保留白标题 `h3`；`padding-top` 占位原介质小字高度，避免与海报叠字 |

| `.employment-hit-stat[data-hit-source]` | 商业数据格：hover/聚焦显示 `.employment-hit-source-popover`（无外链、不可点击固定） |
| `[data-hit-hero]` | 顶图 hover：鼠标上方 `.employment-hit-hero-cursor-tip`；点击打开 Steam（悟空）或豆瓣电影条目（哪吒） |

| `data-employment-hit-sources` | 幻灯片根节点标记；`scripts/employment-hit-sources.js` 在 `slidechanged` 初始化 |

| `.employment-hit-mascot-wrap` | 双卡底部居中矢量小人；`data-hit-mascot="wukong"` / `nezha`，点击播放 CSS 动画（`employment-hit-mascots.js`） |

| 资源 | `assets/employment/hit-wukong.jpeg`（官方海报）· `assets/employment/hit-nezha.jpeg` |

| `.employment-salary-duo` | 中美薪资双图 |

| `.employment-salary-solo` | 国内薪资单图居中放大 |

| `.employment-role-stack` | 顶部美国薪资 + 下方岗位图栈 |

| `.employment-role-hero` | 岗位页顶部美国薪资图 + 标题 |

| `.employment-role-grid` | 2×2 岗位薪资图 |

| `.employment-role-grid-tight` | 紧凑 2×2，图大、标题在图下 |

| `.major-prism-grid` | 成长性三列卡片 |

| `.slide-closing` | 结束 Q&A 页 |



---



## 8. 转场（摘要）



完整规则 → **`transition_guide.md`**



- Reveal `transition: 'none'`；进入动画由 `scripts/chrome/slide-transitions.js` 负责  

- **KEY**：03 / 04 / 06（`zoom-blur` / `curtain` / `flip-y`）  

- **NORMAL 循环**：17 / 14 / 11（`depth` / `blur-wipe` / `chroma`）  

- 新章节：`data-transition-tier="key"` 或 `data-transition-key="..."`  

- 案例模块第 3、4、6 页固定关键转场（见 transition_guide §3.1）



---

## 10. quiz-live 组件（独立站点）

> 完整说明见 [`QUIZ_LIVE_GUIDE.md`](QUIZ_LIVE_GUIDE.md)。样式源：**`styles/style-guide/11-quiz-live.css`**（前缀 `.ql-*`，token `--ql-*`）。

| 类名 / token | 用途 |
|--------------|------|
| `--ql-accent` / `--ql-accent-light` | 品牌粉主色（对齐 SFK magenta） |
| `.ql-app` / `.ql-header` / `.ql-panel` | 观众端布局 |
| `.ql-btn` / `.ql-btn--ghost` / `.ql-btn--danger` | 主按钮 / 次要 / 删除 |
| `.ql-category-grid` / `.ql-category-btn--{theme}` | 选题 2 列网格 |
| `.ql-quiz-progress-*` / `.ql-option` / `.ql-feedback` | 答题进度与选项 |
| `.ql-broadcast` / `.ql-broadcast-track` | 顶部滚屏广播 |
| `.ql-leaderboard-*` / `.ql-score-table` | 观众排行榜 / 控台得分表 |
| `.ql-admin-layout` / `.ql-room-code` | 主持控台 |
| `.ql-screen` / `.ql-participant-chip` | 大屏展示 |

---

## 9. 维护约定

1. 新增**可复用**类 → 对应 `styles/style-guide/*.css` 分片 + 更新本文件  

2. 新增 token → `:root` + `style_guide.md`  

3. 新增转场策略 → `transition_guide.md`（非必要不改 JS 固定页码表）  

4. 已完成模块「往届优秀学员就业案例」的 slide **勿改**，除非用户明确要求  

5. 改 JS/CSS 后更新 `index.html` 中 `?v=` 缓存参数  

6. **quiz-live** 站点类名 / token → `styles/style-guide/11-quiz-live.css` + `docs/guides/QUIZ_LIVE_GUIDE.md`（不经主 deck hub）

