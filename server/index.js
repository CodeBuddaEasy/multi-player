const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { EVENTS, GAME } = require("../shared/constants");
const LobbyManager = require("./lobbymanager");
const { normalizeName, normalizeActionKey, isValidSignal, validateCosmetics } = require("./validation");

const DEBUG = process.env.DEBUG_REACTION_ARENA === "true";
const app = express();
const server = http.createServer(app);
const io = new Server(server);

function debug(...args) {
  if (DEBUG) console.log("[ReactionArena]", ...args);
}

function emitRoomState(room) {
  io.to(room.id).emit(EVENTS.ROOM_STATE, room.serialize());
}

function emitError(socket, message) {
  socket.emit(EVENTS.ERROR_MESSAGE, { message });
}

app.use(express.static(path.join(__dirname, "..", "client")));

io.on(EVENTS.CONNECT, (socket) => {
  debug("connected", socket.id);
  const roomCodePattern = /^[A-Z0-9]{6}$/;

  socket.on(EVENTS.CREATE_ROOM, ({ mode, name } = {}) => {
    const hostName = normalizeName(name);
    if (!hostName) return emitError(socket, "Name is required.");
    const roomMode = mode === "singleplayer" ? "singleplayer" : "multiplayer";
    const room = LobbyManager.createLobby(socket.id, roomMode);
    const player = room.addPlayer({
      id: socket.id,
      name: hostName,
      cosmetics: validateCosmetics({}),
    });
    if (roomMode === "singleplayer") {
      for (let i = 0; i < 2; i += 1) {
        room.addPlayer({
          id: `bot-${room.id}-${i}`,
          name: `Bot ${i + 1}`,
          isBot: true,
          botDifficulty: "normal",
          cosmetics: validateCosmetics({ hatColor: i % 2 ? "white" : "black", badge: i % 2 ? "coffee" : "bug" }),
        });
      }
      room.addMessage("Single-player bots added (Normal).");
    }
    socket.join(room.id);
    socket.emit(EVENTS.ROOM_CREATED, { roomId: room.id, playerId: player.id, mode: roomMode });
    socket.emit(EVENTS.ROOM_JOINED, { roomId: room.id, playerId: player.id });
    room.addMessage(`${player.name} created the room.`);
    emitRoomState(room);
  });

  socket.on(EVENTS.JOIN_ROOM, ({ roomId, name } = {}) => {
    const normalizedRoomId = (roomId || "").trim().toUpperCase();
    if (!roomCodePattern.test(normalizedRoomId)) return emitError(socket, "Invalid room code format.");
    const normalizedName = normalizeName(name);
    if (!normalizedName) return emitError(socket, "Name is required.");
    const room = LobbyManager.getLobby(normalizedRoomId);
    if (!room) return emitError(socket, "Room not found.");
    if (room.mode === "singleplayer") return emitError(socket, "Cannot join single-player room.");
    if (room.players.length >= GAME.MAX_PLAYERS) return emitError(socket, "Room full.");
    if (room.players.some((p) => p.name.toLowerCase() === normalizedName.toLowerCase())) {
      return emitError(socket, "Duplicate name.");
    }
    const player = room.addPlayer({ id: socket.id, name: normalizedName, cosmetics: validateCosmetics({}) });
    socket.join(room.id);
    room.addMessage(`${player.name} joined.`);
    io.to(room.id).emit(EVENTS.PLAYER_JOINED, { name: player.name });
    socket.emit(EVENTS.ROOM_JOINED, { roomId: room.id, playerId: player.id });
    emitRoomState(room);
  });

  socket.on(EVENTS.SET_NAME, ({ name }) => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room) return;
    const player = room.getPlayer(socket.id);
    const normalized = normalizeName(name);
    if (!normalized) return emitError(socket, "Name is required.");
    if (room.players.some((p) => p.socketId !== socket.id && p.name.toLowerCase() === normalized.toLowerCase())) {
      return emitError(socket, "Duplicate name.");
    }
    player.name = normalized;
    emitRoomState(room);
  });

  socket.on(EVENTS.UPDATE_COSMETICS, (payload = {}) => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room) return;
    const player = room.getPlayer(socket.id);
    player.cosmetics = validateCosmetics(payload);
    emitRoomState(room);
  });

  socket.on(EVENTS.READY_TOGGLE, () => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room || room.status !== "lobby") return;
    const player = room.getPlayer(socket.id);
    if (room.mode === "singleplayer") return;
    player.ready = !player.ready;
    emitRoomState(room);
  });

  socket.on(EVENTS.START_SINGLE_PLAYER, ({ botCount = 1, difficulty = "normal", name } = {}) => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room || room.mode !== "singleplayer") return;
    if (room.hostSocketId !== socket.id) return emitError(socket, "Host only action.");
    const host = room.getPlayer(socket.id);
    if (name) host.name = normalizeName(name) || host.name;
    const count = Math.max(1, Math.min(3, Number(botCount) || 1));
    const allowed = ["easy", "normal", "hard"];
    const diff = allowed.includes(difficulty) ? difficulty : "normal";
    room.players = room.players.filter((p) => !p.isBot);
    for (let i = 0; i < count; i += 1) {
      room.addPlayer({
        id: `bot-${room.id}-${i}`,
        name: `Bot ${i + 1}`,
        isBot: true,
        botDifficulty: diff,
        cosmetics: validateCosmetics({ hatColor: i % 2 ? "white" : "black", badge: i % 2 ? "coffee" : "bug" }),
      });
    }
    emitRoomState(room);
  });

  socket.on(EVENTS.START_MATCH, () => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return emitError(socket, "Host only action.");
    if (!room.canStart()) return emitError(socket, "Not enough ready players to start.");
    room.start(io);
    emitRoomState(room);
  });

  socket.on(EVENTS.PLAYER_ACTION, ({ key }) => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room) return;
    const normalized = normalizeActionKey(key);
    if (!isValidSignal(normalized)) return emitError(socket, "Invalid action key.");
    room.applyAction(socket.id, normalized, io);
    emitRoomState(room);
  });

  socket.on(EVENTS.PAUSE_GAME, () => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room || room.status === "finished") return;
    const actor = room.getPlayer(socket.id);
    if (!actor) return;
    if (room.pause(actor.name, io)) emitRoomState(room);
  });

  socket.on(EVENTS.RESUME_GAME, () => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room || room.status !== "paused") return;
    const actor = room.getPlayer(socket.id);
    if (!actor) return;
    if (room.resume(actor.name, io)) emitRoomState(room);
  });

  socket.on(EVENTS.QUIT_GAME, () => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room) return;
    const actor = room.getPlayer(socket.id);
    room.status = "finished";
    room.clearTimers();
    room.addMessage(`${actor.name} quit the game.`);
    io.to(room.id).emit(EVENTS.GAME_QUIT, { by: actor.name });
    io.to(room.id).emit(EVENTS.SYSTEM_MESSAGE, { text: `${actor.name} quit the game.` });
    io.to(room.id).emit(EVENTS.MATCH_FINISHED, {
      ranking: [...room.players].sort((a, b) => b.score - a.score).map((p) => ({ name: p.name, score: p.score })),
    });
    emitRoomState(room);
  });

  socket.on(EVENTS.REQUEST_REMATCH, () => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room) return;
    room.clearTimers();
    room.status = "lobby";
    room.round = { index: 0, phase: "lobby", signal: null, signalShownAt: 0, responseDeadlineAt: 0, resolved: false };
    for (const p of room.players) {
      p.score = 0;
      p.streak = 0;
      p.ready = false;
      p.roundState = { lockedOut: false, answered: false, answerAt: null, answerKey: null, result: "idle" };
    }
    emitRoomState(room);
  });

  socket.on(EVENTS.LEAVE_ROOM, () => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room) return;
    const removed = room.removePlayer(socket.id);
    socket.leave(room.id);
    if (removed) {
      io.to(room.id).emit(EVENTS.PLAYER_LEFT, { name: removed.name });
      room.addMessage(`${removed.name} left.`);
    }
    if (room.players.length === 0) {
      LobbyManager.removeLobby(room.id);
      return;
    }
    if (room.hostSocketId === socket.id) {
      const nextHost = room.humans()[0] || room.players[0];
      room.hostSocketId = nextHost ? nextHost.socketId : null;
      if (nextHost) room.addMessage(`${nextHost.name} is now host.`);
    }
    emitRoomState(room);
  });

  socket.on(EVENTS.DISCONNECT, () => {
    const room = LobbyManager.getLobbyBySocketId(socket.id);
    if (!room) return;
    const removed = room.removePlayer(socket.id);
    if (!removed) return;
    io.to(room.id).emit(EVENTS.PLAYER_LEFT, { name: removed.name });
    room.addMessage(`${removed.name} disconnected.`);
    if (room.players.length === 0) {
      LobbyManager.removeLobby(room.id);
      return;
    }
    if (room.hostSocketId === socket.id) {
      const nextHost = room.humans()[0] || room.players[0];
      room.hostSocketId = nextHost ? nextHost.socketId : null;
    }
    emitRoomState(room);
  });

  socket.on("ROOM_STATE_PING", () => {
    socket.emit("ROOM_STATE_PONG", { ts: Date.now() });
  });
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Reaction Arena server listening on http://localhost:${PORT}`);
});