import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const relayPath = path.resolve(testDir, "../scripts/ws-relay.js");

function waitForMessage(socket, predicate, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", onMessage);
      reject(new Error("Timed out waiting for WebSocket message"));
    }, timeoutMs);

    function onMessage(event) {
      const message = JSON.parse(event.data);
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.removeEventListener("message", onMessage);
      resolve(message);
    }

    socket.addEventListener("message", onMessage);
  });
}

async function connect(url) {
  const socket = new WebSocket(url);
  await once(socket, "open");
  return socket;
}

async function join(socket, hello) {
  const joined = waitForMessage(socket, (message) => message.type === "joined" || message.type === "error");
  socket.send(JSON.stringify({ type: "hello", ...hello }));
  return joined;
}

test("relay authorizes one remote and routes commands and state", async (t) => {
  const port = 18100 + Math.floor(Math.random() * 400);
  const relay = spawn(process.execPath, [relayPath, "--host", "127.0.0.1", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => relay.kill());

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Relay did not start")), 2000);
    relay.stdout.on("data", (chunk) => {
      if (!chunk.toString().includes("listening")) return;
      clearTimeout(timer);
      resolve();
    });
    relay.once("exit", (code) => reject(new Error(`Relay exited with ${code}`)));
  });

  const url = `ws://127.0.0.1:${port}`;
  const token = "A".repeat(32);
  const room = "ICE123";

  const presenter = await connect(url);
  t.after(() => presenter.close());
  assert.equal((await join(presenter, {
    role: "presenter",
    room,
    deckId: "summerschool",
    token,
  })).type, "joined");

  const remote = await connect(url);
  t.after(() => remote.close());
  assert.equal((await join(remote, {
    role: "remote",
    room,
    deckId: "summerschool",
    token,
    clientId: "REMOTECLIENT001",
  })).type, "joined");

  const commandPromise = waitForMessage(presenter, (message) => message.type === "cmd");
  remote.send(JSON.stringify({ type: "cmd", action: "dice_show" }));
  assert.equal((await commandPromise).action, "dice_show");

  const statePromise = waitForMessage(remote, (message) => message.type === "state");
  presenter.send(JSON.stringify({
    type: "state",
    index: 11,
    h: 11,
    v: 0,
    id: "ice-break",
    interaction: { kind: "ice-break", ready: true, visible: true, rolling: false },
  }));
  assert.equal((await statePromise).interaction.visible, true);

  const unauthorized = await connect(url);
  t.after(() => unauthorized.close());
  assert.equal((await join(unauthorized, {
    role: "remote",
    room,
    deckId: "summerschool",
    token: "B".repeat(32),
    clientId: "REMOTECLIENT002",
  })).code, "unauthorized");

  const secondRemote = await connect(url);
  t.after(() => secondRemote.close());
  assert.equal((await join(secondRemote, {
    role: "remote",
    room,
    deckId: "summerschool",
    token,
    clientId: "REMOTECLIENT002",
  })).code, "room_busy");

  const reconnect = await connect(url);
  t.after(() => reconnect.close());
  assert.equal((await join(reconnect, {
    role: "remote",
    room,
    deckId: "summerschool",
    token,
    clientId: "REMOTECLIENT001",
  })).type, "joined");
});
