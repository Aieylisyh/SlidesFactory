# 新人村破冰任务图

本目录是夏校站点内唯一的 Ice Break 运行时模块，通过 `summerschool/index.html#/ice-break` 中的 iframe 加载，以隔离固定 3000×1200 画面比例、样式和键盘交互。

操作：

- `D`：显示或隐藏骰子。
- `Space`：骰子显示后开始或停止投掷。
- 左右方向键 / 鼠标滚轮：返回 Reveal deck 导航。
- 右上角按钮：切换破冰程序全屏。

页面、业务逻辑、宿主样式、宿主桥接和生产图片都集中在本目录。`js/embed-bridge.js` 与 `host-bridge.js` 共同处理 iframe 和 Reveal 之间的键盘及翻页事件。
