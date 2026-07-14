function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest("button, input, textarea, select, a"));
}

export class InputController {
  constructor({ onToggleDice, onToggleRolling }) {
    this.onToggleDice = onToggleDice;
    this.onToggleRolling = onToggleRolling;

    window.addEventListener("keydown", (event) => this.handleKeydown(event));
  }

  handleKeydown(event) {
    if (event.repeat || isInteractiveTarget(event.target)) {
      return;
    }

    if (event.code === "KeyD") {
      event.preventDefault();
      this.onToggleDice();
      return;
    }

    if (event.code === "Space" && this.onToggleRolling()) {
      event.preventDefault();
    }
  }
}
