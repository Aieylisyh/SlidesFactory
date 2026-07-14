export class DiceController {
  constructor({ layer, image, imagePaths, rollIntervalMs, onStatusChange }) {
    this.layer = layer;
    this.image = image;
    this.imagePaths = imagePaths;
    this.rollIntervalMs = rollIntervalMs;
    this.onStatusChange = onStatusChange;

    this.isVisible = false;
    this.isRolling = false;
    this.currentFaceIndex = 0;
    this.rollTimer = null;

    this.preloadImages();
    this.renderFace();
  }

  preloadImages() {
    this.imagePaths.forEach((source) => {
      const image = new Image();
      image.src = source;
    });
  }

  toggleVisibility() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.isVisible = true;
    this.layer.classList.remove("is-settled");
    this.layer.hidden = false;
    this.layer.setAttribute("aria-hidden", "false");
    this.reportStatus(`骰子已显示，当前为 ${this.currentFaceIndex + 1}`);
  }

  hide() {
    if (this.isRolling) {
      this.stopRolling();
    }

    this.layer.classList.remove("is-settled");
    this.isVisible = false;
    this.layer.hidden = true;
    this.layer.setAttribute("aria-hidden", "true");
    this.reportStatus("骰子已隐藏");
  }

  toggleRolling() {
    if (!this.isVisible) {
      return false;
    }

    if (this.isRolling) {
      this.stopRolling();
    } else {
      this.startRolling();
    }

    return true;
  }

  startRolling() {
    this.isRolling = true;
    this.layer.classList.remove("is-settled");
    this.layer.classList.remove("has-result");
    this.layer.classList.add("is-rolling");
    this.showNextRandomFace();
    this.rollTimer = window.setInterval(
      () => this.showNextRandomFace(),
      this.rollIntervalMs,
    );
    this.reportStatus("骰子正在投掷");
  }

  stopRolling() {
    window.clearInterval(this.rollTimer);
    this.rollTimer = null;
    this.isRolling = false;
    this.layer.classList.remove("is-rolling");
    this.layer.classList.add("has-result");
    this.layer.classList.add("is-settled");
    this.reportStatus(`投掷结果为 ${this.currentFaceIndex + 1}`);
  }

  showNextRandomFace() {
    if (this.imagePaths.length < 2) {
      return;
    }

    let nextFaceIndex = this.currentFaceIndex;
    while (nextFaceIndex === this.currentFaceIndex) {
      nextFaceIndex = Math.floor(Math.random() * this.imagePaths.length);
    }

    this.currentFaceIndex = nextFaceIndex;
    this.renderFace();
  }

  renderFace() {
    const faceNumber = this.currentFaceIndex + 1;
    this.image.src = this.imagePaths[this.currentFaceIndex];
    this.image.alt = `骰子结果：${faceNumber}`;
  }

  reportStatus(message) {
    this.onStatusChange?.(message);
  }
}
