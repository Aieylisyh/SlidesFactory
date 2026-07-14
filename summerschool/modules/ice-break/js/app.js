import { DICE_IMAGE_PATHS } from "./config.js?v=2";
import { DiceController } from "./dice-controller.js?v=2";
import { FullscreenController } from "./fullscreen-controller.js";
import { InputController } from "./input-controller.js";

const diceController = new DiceController({
  layer: document.querySelector("#diceLayer"),
  image: document.querySelector("#diceImage"),
  imagePaths: DICE_IMAGE_PATHS,
  onStatusChange(message) {
    document.querySelector("#statusMessage").textContent = message;
  },
});

function getDiceState() {
  return {
    visible: diceController.isVisible,
    rolling: diceController.isRolling,
  };
}

window.IceBreakRemote = Object.freeze({
  getState: getDiceState,
  execute(action) {
    if (action === "dice_show") {
      diceController.show();
    } else if (action === "dice_hide") {
      diceController.hide();
    } else if (action === "dice_roll_start") {
      if (!diceController.isVisible || diceController.isRolling) return false;
      diceController.startRolling();
    } else if (action === "dice_roll_stop") {
      if (!diceController.isRolling) return false;
      diceController.stopRolling();
    } else {
      return false;
    }
    return true;
  },
});

new FullscreenController({
  button: document.querySelector("#fullscreenButton"),
  label: document.querySelector("#fullscreenLabel"),
});

new InputController({
  onToggleDice: () => diceController.toggleVisibility(),
  onToggleRolling: () => diceController.toggleRolling(),
});
