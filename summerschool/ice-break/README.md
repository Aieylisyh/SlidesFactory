# 新人村破冰任务图

本目录由独立破冰程序移植而来，通过 `summerschool/index.html#/ice-break` 中的 iframe 加载，以隔离原程序的固定 3000×1200 画面比例、样式和键盘交互。

操作：

- `D`：显示或隐藏骰子。
- `Space`：骰子显示后开始或停止投掷。
- 左右方向键 / 鼠标滚轮：返回 Reveal deck 导航。
- 右上角按钮：切换破冰程序全屏。

生产图片位于 `assets/summerschool/ice-break/`；`js/embed-bridge.js` 与 `../scripts/ss-ice-break.js` 共同处理 iframe 和 Reveal 之间的键盘及翻页事件。
