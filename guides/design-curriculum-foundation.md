# 通识基础模块 · 课程表可视化设计规范

> **参考源**：宣传册第 26 页（四栏课程矩阵：黑侧栏 + 浅桃色内容区）  
> **Figma 文件**：<https://www.figma.com/design/QLH5Sj8JwDUr6xB1zxm41Q>（与 `salary-echarts-design.md` 同文件）  
> **本地预览**：[`../design/curriculum-foundation-preview.html`](../design/curriculum-foundation-preview.html)（无图片、无 watermark）  
> **幻灯片可选锚点**：`#/curriculum-foundation`（若写入 `index.html`）

---

## 1. 设计目标

| 项 | 说明 |
|----|------|
| 版式 | 复刻第 26 页四栏结构，纯排版，无 SFK 水印与插图 |
| 画布 | 逻辑宽 **1200×820**（Figma Frame）；幻灯片内可缩放到安全区 |
| 语言 | 英文标题 + 中文副题（双语行），与源稿一致 |

---

## 2. 色板（宣传册原稿，非 Dark Deck）

| Token | Hex | 用途 |
|-------|-----|------|
| `sidebar-bg` | `#000000` | 左栏「通识基础模块」 |
| `sidebar-text` | `#FFFFFF` | 侧栏竖排字 |
| `content-bg` | `#F2C4AE` | 主表浅桃色底 |
| `content-text` | `#000000` | 模块名、课题、学时 |
| `divider` | `#000000` | 行分隔线 1px |
| `module-title-weight` | 700 | Design Foundation / 软件课程 等块标题 |

> 若需并入 Reveal 黑底演示，可另做 `curriculum-matrix--deck` 变体（侧栏改品红条、内容区改 `#111` + 白字）；本稿以**宣传册第 26 页**为准。

---

## 3. 栅格（四栏）

```
┌────┬──────────────┬─────────────────────────────┬────┐
│ ①  │ ② 模块名      │ ③ 课题（最宽）               │ ④  │
│ 72 │ ~220px       │ 1fr                         │ 64 │
│ 竖排│ 块标题居中    │ 左对齐，行间 1px 横线         │ 学时│
└────┴──────────────┴─────────────────────────────┴────┘
```

| 栏 | 宽度比 | 对齐 |
|----|--------|------|
| ① 通识基础模块 | ~6% | 竖排居中，`writing-mode: vertical-rl` |
| ② 模块 | ~18% | 块内垂直居中 |
| ③ 课题 | ~68% | 左对齐，padding 12px 16px |
| ④ 学时 | ~8% | 右对齐或居中 |

**侧栏**跨全部行（`grid-row: 1 / -1` 或 flex 同高拉伸）。

---

## 4. 内容数据（录入 Figma / HTML 须一致）

### Design Foundation 1 · 区块学时 10H

| 课题 |
|------|
| Defining Game 定义游戏 |
| Game Structure 游戏结构 |
| Board Game 桌上游戏 |
| Digital Game 数字游戏 |
| Conceptualization & Prototyping 概念与原型 |

### Design Foundation 2 · 10H

| 课题 |
|------|
| Rules & Mechanics 规则与机制 |
| Interface & User experience 界面与用户体验 |
| Level Design 关卡设计 |
| World, Story & Character 世界, 故事与角色 |
| Document & Proposal 游戏设计文档 |

### Design Foundation 3 · 每行 10H

| 课题 |
|------|
| Practice: 桌游改造 |
| Practice: 关卡概念 |
| Practice: UI 设计 |
| Practice: 3D道具设计 |
| Practice: 像素游戏美术 |

### Design Foundation 4 · 每行 10H

| 课题 |
|------|
| Miniproject: GDD |
| Miniproject: 关卡实现 |
| Miniproject: 桌游设计 |
| Miniproject: 3D环境美术 |
| Miniproject: 游戏开发入门 |

### AI课程 · 10H（无子课题行）

### 软件课程 LEVEL 1 · 每行 20H

数字绘画 · 3D建模 · 数字雕刻 · 灯光渲染

### 软件课程 LEVEL 2 · 每行 20H

2D动画合成 · PBR全流程掌握 · 电脑动画

### 软件课程 LEVEL 3 · 每行 20H

虚幻引擎入门 · Unity游戏开发基础 · AIGC · TA游戏特效

---

## 5. Figma 构建步骤（MCP 恢复后执行）

**一键脚本**：将 `design/figma-curriculum-p26-script.js` 全文作为 `use_figma` 的 `code` 参数传入（或让 Agent 读取该文件后调用 MCP）。

1. `fileKey`: `QLH5Sj8JwDUr6xB1zxm41Q`
2. 新建 Frame **`Curriculum · 通识基础模块 (P26)`**，1200×820，置于画布右侧空白区
3. Auto-layout 根：**HORIZONTAL**，无 gap；子节点顺序：侧栏 | 主体（VERTICAL 栈）
4. 每个模块块：HORIZONTAL — `[模块列][课题列][学时列]`；课题列内每行 FRAME + 底部分割线
5. DF1/DF2/AI：学时 **10H** 与模块列同高（单行块级）；DF3/DF4/软件：学时跟 **每一课题行**
6. 字体：Inter Regular 14px / 模块标题 Semi Bold 15px；侧栏 Semi Bold 16px 竖排
7. 完成后 `get_screenshot` 对照 [`../design/curriculum-foundation-preview.html`](../design/curriculum-foundation-preview.html)

---

## 6. 与演示稿的关系

- 本表为**课程体系说明**，与 `outline.md` 四议程无冲突；插入 deck 时建议放在「如何选专业方向」 opener 之前或作为附录页
- 不加 `assets` 图片；符合 `.cursorrules` 零外链图原则
