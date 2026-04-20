const { io } = require("socket.io-client");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function onceWithTimeout(socket, event, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function waitFor(predicate, timeoutMs = 6000, intervalMs = 50) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - started >= timeoutMs) return reject(new Error("Timed out waiting for condition"));
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function connectClient(url) {
  return io(url, { transports: ["websocket"], reconnection: false, timeout: 4000 });
}

async function verifyMultiplayer(url) {
  const host = connectClient(url);
  const guest = connectClient(url);
  let hostRoom = null;
  let guestRoom = null;

  host.on("ROOM_STATE", (room) => {
    hostRoom = room;
  });
  guest.on("ROOM_STATE", (room) => {
    guestRoom = room;
  });

  await Promise.all([onceWithTimeout(host, "connect"), onceWithTimeout(guest, "connect")]);

  host.emit("CREATE_ROOM", { mode: "multiplayer", name: "Host" });
  const created = await onceWithTimeout(host, "ROOM_CREATED");
  assert(created.roomId, "Host did not receive room id");
  await waitFor(() => hostRoom && hostRoom.id === created.roomId);

  guest.emit("JOIN_ROOM", { roomId: created.roomId, name: "Guest" });
  await onceWithTimeout(guest, "ROOM_JOINED");
  await waitFor(() => hostRoom && hostRoom.players.length === 2 && guestRoom && guestRoom.players.length === 2);

  host.emit("READY_TOGGLE");
  guest.emit("READY_TOGGLE");
  await waitFor(() => hostRoom.players.every((p) => p.ready));

  host.emit("START_MATCH");
  await waitFor(() => hostRoom.status !== "lobby" && hostRoom.round && hostRoom.round.index >= 1, 9000);
  await waitFor(() => hostRoom.round.phase === "signal_live", 9000);

  const signal = hostRoom.round.signal;
  assert(signal, "Round signal did not appear");
  host.emit("PLAYER_ACTION", { key: signal });
  guest.emit("PLAYER_ACTION", { key: signal });

  await waitFor(
    () => hostRoom.round.phase === "round_resolved" && hostRoom.players.some((p) => p.roundState.result === "winner"),
    9000
  );

  host.disconnect();
  guest.disconnect();
}

async function verifySinglePlayer(url) {
  const solo = connectClient(url);
  let roomState = null;

  solo.on("ROOM_STATE", (room) => {
    roomState = room;
  });

  await onceWithTimeout(solo, "connect");
  solo.emit("CREATE_ROOM", { mode: "singleplayer", name: "Solo" });
  await onceWithTimeout(solo, "ROOM_CREATED");
  await waitFor(() => roomState && roomState.mode === "singleplayer" && roomState.players.length >= 3);

  solo.emit("START_MATCH");
  await waitFor(() => roomState.status !== "lobby" && roomState.round.index >= 1, 9000);
  await waitFor(() => roomState.round.phase === "signal_live", 9000);

  const signal = roomState.round.signal;
  assert(signal, "Single-player signal missing");
  solo.emit("PLAYER_ACTION", { key: signal });
  await waitFor(() => roomState.round.phase === "round_resolved", 9000);

  solo.disconnect();
}

async function run() {
  const url = process.env.TEST_SERVER_URL || "http://127.0.0.1:3000";
  await verifyMultiplayer(url);
  await verifySinglePlayer(url);
  console.log("verify-e2e-flows: OK");
}

run().catch((err) => {
  console.error("verify-e2e-flows: FAILED", err.message);
  process.exit(1);
});
