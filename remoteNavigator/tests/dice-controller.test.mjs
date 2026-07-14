import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const controllerPath = path.resolve(
  testDir,
  "../../summerschool/modules/ice-break/js/dice-controller.js",
);
const controllerSource = await readFile(controllerPath, "utf8");
const controllerModuleUrl = `data:text/javascript;base64,${Buffer.from(controllerSource).toString("base64")}`;
const { DiceController } = await import(controllerModuleUrl);

function createFixture() {
  const classes = new Set();
  const animationFrames = new Map();
  let nextAnimationFrameId = 1;

  globalThis.Image = class MockImage {
    src = "";
  };
  globalThis.window = {
    requestAnimationFrame(callback) {
      const id = nextAnimationFrameId++;
      animationFrames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      animationFrames.delete(id);
    },
  };

  const layer = {
    hidden: true,
    classList: {
      add(...names) {
        names.forEach((name) => classes.add(name));
      },
      remove(...names) {
        names.forEach((name) => classes.delete(name));
      },
    },
    setAttribute() {},
  };
  const image = { src: "", alt: "" };
  const controller = new DiceController({
    layer,
    image,
    imagePaths: ["1", "2", "3", "4", "5", "6"],
  });

  return {
    controller,
    runNextFrame() {
      const entry = animationFrames.entries().next().value;
      assert.ok(entry, "an animation frame should be scheduled");
      const [id, callback] = entry;
      animationFrames.delete(id);
      callback();
    },
    get scheduledFrameCount() {
      return animationFrames.size;
    },
  };
}

test("dice pool draws every face once before refilling", () => {
  const { controller } = createFixture();
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const faces = [];
    for (let index = 0; index < 6; index += 1) {
      const previousFace = controller.currentFaceIndex;
      controller.showNextRandomFace();
      assert.notEqual(controller.currentFaceIndex, previousFace);
      faces.push(controller.currentFaceIndex + 1);
    }

    assert.deepEqual([...faces].sort(), [1, 2, 3, 4, 5, 6]);
    assert.equal(controller.facePool.length, 0);
  }
});

test("rolling changes face on every animation frame and cancels cleanly", () => {
  const fixture = createFixture();
  const { controller } = fixture;
  controller.show();
  controller.startRolling();

  assert.equal(fixture.scheduledFrameCount, 1);
  for (let index = 0; index < 12; index += 1) {
    const previousFace = controller.currentFaceIndex;
    fixture.runNextFrame();
    assert.notEqual(controller.currentFaceIndex, previousFace);
    assert.equal(fixture.scheduledFrameCount, 1);
  }

  controller.stopRolling();
  assert.equal(fixture.scheduledFrameCount, 0);
  assert.equal(controller.isRolling, false);
});
