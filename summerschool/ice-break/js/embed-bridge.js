const MESSAGE_TYPE = "ss-ice-break-navigate";
const FORWARDED_KEY_TYPE = "ss-ice-break-key";

function notifyParent(direction) {
  if (window.parent === window) {
    return;
  }

  window.parent.postMessage({ type: MESSAGE_TYPE, direction }, "*");
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || event.data?.type !== FORWARDED_KEY_TYPE) {
    return;
  }

  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      code: event.data.code,
      key: event.data.key,
      bubbles: true,
      cancelable: true,
    }),
  );
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) {
    return;
  }

  if (event.code === "ArrowLeft" || event.code === "PageUp") {
    event.preventDefault();
    notifyParent("previous");
  } else if (event.code === "ArrowRight" || event.code === "PageDown") {
    event.preventDefault();
    notifyParent("next");
  }
});

window.addEventListener(
  "wheel",
  (event) => {
    if (Math.abs(event.deltaY) < 8) {
      return;
    }
    notifyParent(event.deltaY > 0 ? "next" : "previous");
  },
  { passive: true },
);
