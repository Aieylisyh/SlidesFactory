# Remote Focus Map · 翻页笔互动焦点分布图

> **角色**：在翻页笔 / 手机遥控上，用 **方向键定位 + 确认键** 模拟鼠标点击页内互动控件，解决「鼠标 hover 演示」与「翻页笔无指针」的矛盾。  
> **关联**：[`REMOTE_GUIDE.md`](REMOTE_GUIDE.md) · [`remote-navigator-ops-zh.md`](remote-navigator-ops-zh.md) · [`segment_arrow.md`](segment_arrow.md) · [`style_guide_extended.md`](style_guide_extended.md) §7

---

## 1. 两种遥控模式

| 模式 | 触发 | ← / → | ↑ / ↓ | 确认 ✓ |
|------|------|-------|-------|--------|
| **Deck**（默认） | 打开遥控 / 退出 Focus | 上一页 / 下一页 | （未用） | 下一页 |
| **Focus**（互动） | 点「互动」或当前页有焦点且按 ✓ | 焦点左 / 右 | 焦点上 / 下 | 对当前焦点执行 `click` 等 action |

**规则**

- 换页（Deck 模式下 prev/next，或 Focus 模式下 `data-goto` 跳章）后：**清空焦点**，默认回到 Deck 模式。
- 当前 slide 在 `deck-nav.json` 中 **无 `focusProfile`**：隐藏 D-pad，Confirm 等同下一页。
- Share Lock（`?share=`）下 **仍可使用 Focus**（仅禁 deck 级翻页，页内互动保留，见 [`SHARE_GUIDE.md`](SHARE_GUIDE.md)）。

---

## 2. 架构

```text
[手机 remote.html]  D-pad + Confirm
        │  WebSocket (focus_move / focus_confirm / focus_mode)
        ▼
[presenter-bridge.js]  iframe 桥接
        │  contentWindow.DeckFocusNav.*
        ▼
[deck-focus-nav.js]  注入主 deck iframe
        │  读 deck-nav.json → focusProfile → 扫描 DOM rect
        ▼
[大屏]  .deck-remote-focus-ring + element.click()
```

| 文件 | 职责 |
|------|------|
| `shared/scripts/deck-focus-nav.js` | 焦点扫描、方向导航、确认、高亮环 |
| `remoteNavigator/scripts/focus-profiles.js` | Profile 定义（生成器 + 运行时共用逻辑说明） |
| `remoteNavigator/scripts/generate-deck-nav.js` | 为每页写入 `focusProfile` |
| `remoteNavigator/scripts/protocol.js` | `focus_*` 消息 |
| `remoteNavigator/scripts/presenter-bridge.js` | 注入脚本、转发 cmd、state 带 focus |
| `remoteNavigator/scripts/remote-ui.js` | D-pad UI |

**零侵入主 deck**：不修改 `index.html` / `main.js`；`presenter.html` 在 iframe Reveal ready 后注入 `deck-focus-nav.js`。

---

## 3. 分布图：`deck-nav.json` 扩展

在 `slides[]` 每项增加可选字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `focusProfile` | `string \| null` | 引用 §5 Profile 表；`null` 表示本页无遥控焦点 |
| `focusTargets` | `object[]` | 可选；生成时静态清单（调试 / 文档）；**运行时以 DOM 扫描为准** |

静态 target 条目（可选，供文档与生成器校验）：

```json
{
  "id": "agenda-seg-1",
  "selector": "[data-segment-arrow-segment][data-goto='#/portfolio-planning']",
  "label": "01 如何规划作品集",
  "action": "click",
  "order": 1
}
```

| 字段 | 说明 |
|------|------|
| `selector` | 在当前 `<section>` 内 query；优先稳定 `data-*` |
| `label` | 手机遥控与讲者态角标文案 |
| `action` | `click`（默认）· `toggle` · `adjust`（滑块，V2） |
| `order` | 无方向键时的 Tab 顺序 fallback |
| `dynamic` | `true` 表示节点由 JS 生成，每次进入 Focus 或换页后 **rescan** |

**版本**：`deck-nav.json` 的 `version` 升为 `2`（含 focus 字段）。

---

## 4. 运行时：逻辑 Profile + 物理 Rect

### 4.1 扫描（`DeckFocusNav.scan()`）

1. 取当前 leaf `<section>` 与 `focusProfile`。
2. 按 Profile 规则 query 可焦点元素（须可见、非 `disabled`）。
3. 记录 `getBoundingClientRect()`，中心点 `(cx, cy)` 相对 viewport。
4. 按 `order` 或 DOM 顺序排序，写入 `state.targets[]`。

### 4.2 方向键（最近邻）

对当前焦点 `P`，在其余目标中按方向过滤：

| 方向 | 候选条件（示意） |
|------|------------------|
| → | `cx > P.cx + ε`，且 `\|cy - P.cy\|` 最小 |
| ← | `cx < P.cx - ε`，且 `\|cy - P.cy\|` 最小 |
| ↓ | `cy > P.cy + ε`，且 `\|cx - P.cx\|` 最小 |
| ↑ | `cy < P.cy - ε`，且 `\|cx - P.cx\|` 最小 |

无候选：短震（`navigator.vibrate`），焦点不变。

### 4.3 确认（`DeckFocusNav.confirm()`）

| action | 行为 |
|--------|------|
| `click` | `element.focus()` + `element.click()`；触发各模块已有逻辑（`data-goto`、chip 等） |
| `toggle` | 同 click（图例、Tab） |
| `adjust` | V2：←→ 改 slider 值，不翻页 |

### 4.4 大屏反馈

- 焦点环：`.deck-remote-focus-ring`（品红 3px outline，随 rect 更新）。
- 可选角标：`2/4 · 02 往届就业案例`（与手机同步，由 `state.focus` 驱动）。

样式由 `deck-focus-nav.js` 注入 `<style>`，不写入 `style_guide.css`（避免非 Remote 场景污染）。

---

## 5. Focus Profile 登记表

| Profile ID | 适用 slide | 扫描选择器 | 布局 |
|------------|------------|------------|------|
| `segment-arrow-4` | `kind: agenda` | `[data-segment-arrow-segment]` | 1×4 左→右 |
| `segment-arrow-3` | `#major-growth` | `[data-segment-arrow-segment]` | 1×3 左→右 |
| `case-match-page` | `#case-match` | 案例卡 + `.match-chip` | 上卡下池 |
| `portfolio-axis` | `data-portfolio-axis` / `#portfolio-trends` | `.portfolio-axis-chip` | 3 列 × 2 行 |
| `match-game` | `data-match-game` | `.match-chip`（V2） | 双池 |

**MVP 已实现**：前 3 项。其余 Profile 在 `focus-profiles.js` 预留，生成器可提前写 `focusProfile`，运行时扫描为空则等同无焦点。

### 5.1 与「常显文案」策略一致

分段箭头等内容页文案 **默认 50% 不透明、常显**（见 [`segment_arrow.md`](segment_arrow.md) §5）。Focus 选中段时环高亮 + 可选升至 100% 不透明；**不依赖 hover**。

---

## 6. WebSocket 协议扩展

在 [`protocol.js`](../remoteNavigator/scripts/protocol.js) 既有消息上增加：

### 6.1 Remote → Presenter（cmd）

```json
{ "type": "cmd", "action": "focus_mode", "enabled": true }
{ "type": "cmd", "action": "focus_move", "dir": "up|down|left|right" }
{ "type": "cmd", "action": "focus_confirm" }
```

### 6.2 Presenter → Remote（state / ack）

```json
{
  "type": "state",
  "index": 1,
  "h": 1,
  "v": 0,
  "id": "agenda",
  "title": "议程",
  "focus": {
    "mode": "focus",
    "enabled": true,
    "targetIndex": 1,
    "targetId": "agenda-seg-2",
    "label": "02 往届就业案例",
    "totalTargets": 4
  }
}
```

`focus` 省略或 `totalTargets: 0` 表示本页不可 Focus。

---

## 7. 手机 UI（`remote.html`）

```text
┌─────────────────────────┐
│  2/32 · 议程             │
│  焦点：02 往届就业案例    │  ← #remote-focus-label
├─────────────────────────┤
│  [ 上一页 ]  [ 下一页 ]   │
├─────────────────────────┤
│       [ ↑ ]             │
│  [ ← ] [ ✓ ] [ → ]      │  ← #focus-pad（有 focusProfile 时显示）
│       [ ↓ ]             │
│  [ 互动模式 · 开 ]       │  ← #btn-focus-mode
├─────────────────────────┤
│  章节跳转 …              │
└─────────────────────────┘
```

| 控件 | Deck 模式 | Focus 模式 |
|------|-----------|------------|
| 上一页 / 下一页 | 翻页 | 翻页（退出当前焦点序号） |
| D-pad | 隐藏或 disabled | `focus_move` |
| ✓ | 下一页 | `focus_confirm` |
| 互动开关 | 进入 Focus 并聚焦首项 | 退出 Focus |

---

## 8. 生成与维护

### 8.1 命令

改 `index.html` 或新增互动页后：

```bat
node remoteNavigator/scripts/generate-deck-nav.js
```

脚本会根据 slide `id` / `kind` / `className` / `data-*` 自动写入 `focusProfile`（见 `focus-profiles.js` → `detectFocusProfile`）。

### 8.2 新增互动页 Checklist

1. 在 [`config/outline.md`](../config/outline.md) 小节表注明 `interactive` 与是否需 Remote Focus。
2. HTML 使用稳定 `data-*`（与 [`style_guide_extended.md`](style_guide_extended.md) 一致）。
3. 若现有 Profile 不适用：在 `focus-profiles.js` 增加 Profile + 更新 §5 表。
4. 运行 `generate-deck-nav.js`，检查 `deck-nav.json` 中该页 `focusProfile`。
5. 现场排练：`presenter.html` → 手机 Focus 模式逐页点验。

### 8.3 可选 HTML 声明（V2）

```html
<button type="button" data-remote-focus="salary-tab-unreal" data-remote-label="Unreal 岗位">
```

生成器可扫描 `data-remote-focus` 自动生成 `focusTargets[]`；运行时优先于 Profile 扫描。

---

## 9. 边界与限制

| 场景 | 行为 |
|------|------|
| B 站 iframe 内控件 | 父页无法深控；Profile 仅焦点到 `[data-bilibili-frame]`，Confirm 无法代替播放器内按钮 |
| ECharts 曲线区 | 用图例 Toggle 代替精确点选 |
| 动态 DOM | `dynamic: true` → `slidechanged` / 进入 Focus 时 rescan |
| 竖屏 deck | rect 随 Reveal 缩放；方向键仍用 viewport 坐标 |
| 滚轮 | Focus 模式下不拦截 wheel（[`WHEEL_NAV_GUIDE.md`](WHEEL_NAV_GUIDE.md)） |
| 无 presenter / 直接开 index | 不注入 `deck-focus-nav.js`，无影响 |

---

## 10. 实施阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| **MVP** | 文档 + 议程 4 段 + 成长性 3 段 + 案例页（卡片+对对碰）+ 三轴热点 | 当前 |
| **V2** | salary-echarts、major-picker、portfolio-axis | 待做 |
| **V3** | match-game、slider `adjust`、data-remote-focus 扫描 | 待做 |
| **V4** | 大屏角标、Presenter 端焦点预览 | 待做 |

---

## 11. 相关文档

- 现场操作：[`remote-navigator-ops-zh.md`](remote-navigator-ops-zh.md) — 同一 WiFi → bat → 扫码 → **互动模式**试按 ✓
- 技术总览：[`REMOTE_GUIDE.md`](REMOTE_GUIDE.md)
- 互动区事件：[`WHEEL_NAV_GUIDE.md`](WHEEL_NAV_GUIDE.md) — 勿拦 `wheel`
