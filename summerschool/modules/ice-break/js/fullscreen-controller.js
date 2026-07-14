export class FullscreenController {
  constructor({ button, label }) {
    this.button = button;
    this.label = label;

    this.button.addEventListener("click", () => this.toggle());
    document.addEventListener("fullscreenchange", () => this.render());

    this.render();
  }

  async toggle() {
    if (!document.fullscreenEnabled) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("无法切换全屏模式：", error);
    } finally {
      this.button.blur();
    }
  }

  render() {
    const isFullscreen = Boolean(document.fullscreenElement);
    this.button.disabled = !document.fullscreenEnabled;
    this.label.textContent = isFullscreen ? "退出全屏" : "全屏";
    this.button.setAttribute(
      "aria-label",
      isFullscreen ? "退出全屏模式" : "进入全屏模式",
    );
  }
}
