const socket = io();

const state = {
  room: null,
  localPressed: new Set(),
  sfxOn: true,
  musicOn: true,
  volume: 0.4,
  screen: "menu",
  dirty: true,
  fps: 0,
  lastRafAt: performance.now(),
  pingMs: 0,
  pendingMode: null,
};

const tones = {
  click: 480,
  tick: 700,
  reveal: 940,
  correct: 860,
  wrong: 250,
  false: 190,
  pause: 300,
  end: 550,
};

function playTone(name, duration = 0.08) {
  if (!state.sfxOn) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ac = playTone.ac || (playTone.ac = new AudioCtx());
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.frequency.value = tones[name] || 440;
  osc.connect(gain);
  gain.connect(ac.destination);
  gain.gain.value = state.volume * 0.14;
  osc.start();
  osc.stop(ac.currentTime + duration);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  document.getElementById(`screen-${id}`).classList.add("active");
  state.screen = id;
  state.dirty = true;
}

function showOverlay(id, show = true) {
  document.getElementById(id).classList.toggle("show", show);
}

function fmtMs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function seatNode(seat) {
  return document.getElementById(`seat-${seat}`);
}

function renderRoom() {
  if (!state.room) return;
  const room = state.room;
  const me = room.players.find((p) => p.socketId === socket.id);
  const isHost = room.hostSocketId === socket.id;
  const canStart = room.mode === "singleplayer" ? room.players.length >= 2 : room.players.length >= 2 && room.players.every((p) => p.ready);
  document.getElementById("lobby-room-id").textContent = room.id;
  document.getElementById("invite-url").textContent = `${location.origin}?room=${room.id}`;
  document.getElementById("timer").textContent = fmtMs(room.timeRemainingMs || 0);
  document.getElementById("status-banner").textContent = `${room.status.toUpperCase()} • Round ${room.round.index || 0}`;
  document.getElementById("signal-board").textContent = room.round.signal ? room.round.signal.replace("Arrow", "").toUpperCase() : "WAIT";

  const lobbyPlayers = document.getElementById("lobby-players");
  lobbyPlayers.innerHTML = "";
  room.players.forEach((p) => {
    const card = document.createElement("div");
    card.className = `player-card ${p.ready ? "is-ready" : ""} ${p.socketId === room.hostSocketId ? "is-host" : ""}`;
    card.innerHTML = `<strong>${p.name}${p.isBot ? " [BOT]" : ""}</strong><div>Seat: ${p.seat}</div><div>Score: ${p.score}</div><div>${p.ready ? "Ready" : "Not ready"}</div>`;
    lobbyPlayers.appendChild(card);
  });

  ["top", "right", "bottom", "left"].forEach((seat) => {
    const el = seatNode(seat);
    const player = room.players.find((p) => p.seat === seat);
    if (!player) {
      el.innerHTML = "<div>Empty seat</div>";
      el.className = "seat";
      return;
    }
    el.className = `seat flash-${player.roundState.result}`;
    el.innerHTML = `<div><strong>${player.name}</strong>${player.socketId === room.hostSocketId ? " ★" : ""}</div>
      <div>${player.isBot ? "Bot" : "Human"} • ${player.score} pts</div>
      <div>Hat: ${player.cosmetics.hatColor}, Shoes: ${player.cosmetics.footwear}</div>
      <div>Badge: ${player.cosmetics.badge}, Coding: ${player.cosmetics.codingAffinity}</div>`;
  });

  const feed = document.getElementById("message-feed");
  feed.innerHTML = "";
  (room.lastMessages || []).slice(-12).forEach((m) => {
    const d = document.createElement("div");
    d.className = "msg-item";
    d.textContent = m.text;
    feed.appendChild(d);
  });

  const startBtn = document.getElementById("start-match");
  const readyBtn = document.getElementById("ready-toggle");
  const applyBotsBtn = document.getElementById("apply-bots");
  startBtn.disabled = !isHost || !canStart || room.status !== "lobby";
  startBtn.style.display = isHost ? "inline-block" : "none";
  readyBtn.disabled = room.mode === "singleplayer" || room.status !== "lobby";
  readyBtn.style.display = room.mode === "singleplayer" ? "none" : "inline-block";
  if (me && room.mode === "multiplayer") {
    readyBtn.textContent = me.ready ? "Unready" : "Ready";
  }
  applyBotsBtn.style.display = room.mode === "singleplayer" && isHost ? "inline-block" : "none";

  if (room.status === "lobby") showScreen("lobby");
  if (["countdown", "in_round", "paused", "signal_live", "round_resolved", "suspense"].includes(room.status)) showScreen("arena");
  if (room.status === "finished") showScreen("end");
}

function emitAction(key) {
  socket.emit("PLAYER_ACTION", { key });
}

document.getElementById("create-match").onclick = () => {
  const name = document.getElementById("player-name").value.trim();
  if (!name) {
    document.getElementById("menu-error").textContent = "Enter your name before creating a match.";
    return;
  }
  playTone("click");
  document.getElementById("menu-error").textContent = "";
  state.pendingMode = "multiplayer";
  socket.emit("CREATE_ROOM", { mode: "multiplayer", name });
};
document.getElementById("join-match").onclick = () => {
  const name = document.getElementById("player-name").value.trim();
  const roomId = document.getElementById("room-code").value.trim().toUpperCase();
  if (!name) {
    document.getElementById("menu-error").textContent = "Enter your name before joining a match.";
    return;
  }
  if (!/^[A-Z0-9]{6}$/.test(roomId)) {
    document.getElementById("menu-error").textContent = "Enter a valid 6-character room code.";
    return;
  }
  playTone("click");
  document.getElementById("menu-error").textContent = "";
  state.pendingMode = null;
  socket.emit("JOIN_ROOM", {
    roomId,
    name,
  });
};
document.getElementById("single-player").onclick = () => {
  const name = document.getElementById("player-name").value.trim();
  if (!name) {
    document.getElementById("menu-error").textContent = "Enter your name before starting single player.";
    return;
  }
  playTone("click");
  document.getElementById("menu-error").textContent = "";
  state.pendingMode = "singleplayer";
  socket.emit("CREATE_ROOM", { mode: "singleplayer", name });
};
document.getElementById("how-to").onclick = () => showOverlay("overlay-how", true);
document.getElementById("settings-btn").onclick = () => showOverlay("overlay-settings", true);
document.querySelectorAll(".close-overlay").forEach((btn) => (btn.onclick = () => btn.closest(".overlay").classList.remove("show")));

document.getElementById("apply-cosmetics").onclick = () => {
  playTone("click");
  socket.emit("UPDATE_COSMETICS", {
    hatColor: document.getElementById("hat-color").value,
    footwear: document.getElementById("footwear").value,
    badge: document.getElementById("badge").value,
    codingAffinity: document.getElementById("coding-affinity").value,
  });
};
document.getElementById("ready-toggle").onclick = () => socket.emit("READY_TOGGLE");
document.getElementById("start-match").onclick = () => socket.emit("START_MATCH");
document.getElementById("leave-room").onclick = () => {
  socket.emit("LEAVE_ROOM");
  state.room = null;
  showScreen("menu");
};
document.getElementById("apply-bots").onclick = () => {
  socket.emit("START_SINGLE_PLAYER", {
    botCount: Number(document.getElementById("bot-count").value) || 1,
    difficulty: document.getElementById("bot-difficulty").value,
    name: document.getElementById("player-name").value.trim(),
  });
};
document.getElementById("pause-btn").onclick = () => socket.emit("PAUSE_GAME");
document.getElementById("quit-btn").onclick = () => socket.emit("QUIT_GAME");
document.getElementById("resume-btn").onclick = () => socket.emit("RESUME_GAME");
document.getElementById("rematch-btn").onclick = () => socket.emit("REQUEST_REMATCH");
document.getElementById("menu-btn").onclick = () => location.reload();

document.getElementById("toggle-music").onchange = (e) => (state.musicOn = !!e.target.checked);
document.getElementById("toggle-sfx").onchange = (e) => (state.sfxOn = !!e.target.checked);
document.getElementById("master-volume").oninput = (e) => (state.volume = Number(e.target.value) || 0.4);

window.addEventListener("keydown", (e) => {
  const key = e.code === "KeyW" ? "ArrowUp" : e.code === "KeyA" ? "ArrowLeft" : e.code === "KeyS" ? "ArrowDown" : e.code === "KeyD" ? "ArrowRight" : e.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
    e.preventDefault();
    if (e.repeat || state.localPressed.has(key)) return;
    state.localPressed.add(key);
    emitAction(key);
  } else if (e.key === "Escape") {
    if (state.room?.status === "paused") socket.emit("RESUME_GAME");
    else socket.emit("PAUSE_GAME");
  }
});
window.addEventListener("keyup", (e) => {
  const key = e.code === "KeyW" ? "ArrowUp" : e.code === "KeyA" ? "ArrowLeft" : e.code === "KeyS" ? "ArrowDown" : e.code === "KeyD" ? "ArrowRight" : e.key;
  state.localPressed.delete(key);
});

socket.on("ROOM_CREATED", ({ roomId }) => {
  document.getElementById("room-code").value = roomId;
  document.getElementById("menu-error").textContent = "";
  if (state.pendingMode === "singleplayer") {
    socket.emit("START_SINGLE_PLAYER", { botCount: 2, difficulty: "normal" });
  }
  showScreen("lobby");
});
socket.on("ROOM_JOINED", () => showScreen("lobby"));
socket.on("ROOM_STATE", (room) => {
  state.room = room;
  state.pendingMode = null;
  state.dirty = true;
});
socket.on("ERROR_MESSAGE", ({ message }) => {
  if (state.screen === "menu") {
    document.getElementById("menu-error").textContent = message;
    return;
  }
  const feed = document.getElementById("message-feed");
  if (feed) {
    const d = document.createElement("div");
    d.className = "msg-item";
    d.textContent = `Error: ${message}`;
    feed.prepend(d);
  }
});
socket.on("SYSTEM_MESSAGE", ({ text }) => {
  if (/false started/i.test(text)) playTone("false");
  if (/resumed/i.test(text)) playTone("tick", 0.05);
  if (/paused/i.test(text)) playTone("pause");
  state.dirty = true;
});
socket.on("ROUND_COUNTDOWN", () => playTone("tick"));
socket.on("ROUND_SIGNAL", () => playTone("reveal"));
socket.on("SCORE_UPDATE", () => playTone("correct", 0.05));
socket.on("ROUND_RESULT", ({ players }) => {
  const me = state.room?.players?.find((p) => p.socketId === socket.id);
  const updated = players?.find((p) => p.socketId === socket.id);
  const result = updated?.roundState?.result || me?.roundState?.result;
  if (result === "wrong") playTone("wrong");
  if (result === "false_start") playTone("false");
  if (result === "winner" || result === "correct") playTone("correct");
});
socket.on("GAME_PAUSED", ({ by }) => {
  playTone("pause");
  document.getElementById("pause-by").textContent = `${by} paused the game.`;
  showOverlay("overlay-pause", true);
});
socket.on("GAME_RESUMED", () => {
  showOverlay("overlay-pause", false);
});
socket.on("MATCH_FINISHED", ({ ranking }) => {
  playTone("end", 0.2);
  const top = ranking[0];
  document.getElementById("winner-title").textContent = `Winner: ${top ? top.name : "N/A"}`;
  const list = document.getElementById("final-ranking");
  list.innerHTML = "";
  ranking.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = `${p.name}: ${p.score}`;
    list.appendChild(li);
  });
  showScreen("end");
});
socket.on("GAME_QUIT", ({ by }) => {
  document.getElementById("winner-title").textContent = `${by} quit the match`;
  document.getElementById("final-ranking").innerHTML = "";
  showScreen("end");
});
socket.on("ROOM_STATE_PONG", ({ ts }) => {
  state.pingMs = Math.max(0, Date.now() - ts);
});

function rafLoop(now) {
  const dt = now - state.lastRafAt;
  state.lastRafAt = now;
  state.fps = dt > 0 ? Math.round(1000 / dt) : 0;
  if (state.dirty && state.room) {
    renderRoom();
    state.dirty = false;
  }
  const debug = document.getElementById("debug-overlay");
  if (state.room) {
    if (window.ReactionArenaDebug) debug.textContent = window.ReactionArenaDebug.formatDebugSnapshot(state.room, state.fps, state.pingMs);
    else debug.textContent = `room: ${state.room.id}\nphase: ${state.room.round.phase}\nfps: ${state.fps}`;
  }
  requestAnimationFrame(rafLoop);
}
requestAnimationFrame(rafLoop);

setInterval(() => {
  socket.volatile.emit("ROOM_STATE_PING");
  if (state.room) state.dirty = true;
}, 1500);
