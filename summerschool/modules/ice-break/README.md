# 新人村破冰任务图

本目录是夏校站点内唯一的 Ice Break 运行时模块，也是页面、业务逻辑和生产素材的唯一代码来源。它通过 `summerschool/index.html#/ice-break` 中的 iframe 加载，以隔离固定 3000×1200 画面比例、样式和键盘交互。

操作：

- `D`：显示或隐藏骰子。
- `Space`：骰子显示后开始或停止投掷。
- 左右方向键 / 鼠标滚轮：返回 Reveal deck 导航。
- 右上角按钮：切换破冰程序全屏。

页面、业务逻辑、宿主样式、宿主桥接和生产图片都集中在本目录。`js/embed-bridge.js` 与 `host-bridge.js` 共同处理 iframe 和 Reveal 之间的键盘及翻页事件。

维护边界：

- 不在 `assets/summerschool/ice-break/`、`summerschool/ice-break/`、`summerschool/scripts/` 或外部 runtime 目录复制另一份实现。
- 可编辑 PSD / 原始 PNG 可以留在素材归档处，但不作为本模块的运行时依赖。
- 手机端显示/隐藏和开始/停止指令由 `remoteNavigator/` 提供，协议见 [`docs/guides/REMOTE_GUIDE.md`](../../../docs/guides/REMOTE_GUIDE.md)。
- 修改骰子逻辑后，从仓库根目录运行 `node --test remoteNavigator/tests/dice-controller.test.mjs remoteNavigator/tests/ws-relay.test.mjs`。
