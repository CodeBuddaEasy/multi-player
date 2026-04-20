const { GAME, EVENTS } = require("../shared/constants");
const { chooseBotAction, BOT_PROFILES, randInt } = require("./botAI");

function pickSeat(players) {
  const seats = ["top", "right", "bottom", "left"];
  for (const seat of seats) {
    if (!players.some((p) => p.seat === seat)) return seat;
  }
  return null;
}

function defaultRoundState() {
  return {
    lockedOut: false,
    answered: false,
    answerAt: null,
    answerKey: null,
    result: "idle",
  };
}

class Game {
  constructor(id, hostSocketId, mode = "multiplayer") {
    this.id = id;
    this.hostSocketId = hostSocketId;
    this.mode = mode;
    this.status = "lobby";
    this.durationMs = GAME.DEFAULT_DURATION_MS;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.pauseStartedAt = null;
    this.accumulatedPauseMs = 0;
    this.matchEndsAt = null;
    this.timerTick = null;
    this.roundTimeout = null;
    this.roundTimeoutDelayMs = 0;
    this.roundTimeoutStartedAt = 0;
    this.roundTimeoutCallback = null;
    this.pausedRoundRemainingMs = 0;
    this.statusBeforePause = null;
    this.botTimeouts = [];
    this.lastRoundWinner = null;
    this.isSuddenDeath = false;
    this.round = { index: 0, phase: "lobby", signal: null, signalShownAt: 0, responseDeadlineAt: 0, resolved: false };
    this.messages = [];
    this.players = [];
  }

  addMessage(text) {
    const msg = { id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, text, at: Date.now() };
    this.messages.push(msg);
    if (this.messages.length > 20) this.messages.shift();
    return msg;
  }

  addPlayer({ id, name, isBot = false, botDifficulty = null, cosmetics }) {
    if (this.players.length >= GAME.MAX_PLAYERS) return null;
    const seat = pickSeat(this.players);
    if (!seat) return null;
    const player = {
      id,
      socketId: id,
      name,
      seat,
      ready: false,
      connected: true,
      isBot,
      botDifficulty,
      cosmetics,
      score: 0,
      streak: 0,
      roundState: defaultRoundState(),
    };
    this.players.push(player);
    return player;
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex((p) => p.socketId === socketId);
    if (idx === -1) return null;
    const [removed] = this.players.splice(idx, 1);
    return removed;
  }

  getPlayer(socketId) {
    return this.players.find((p) => p.socketId === socketId);
  }

  humans() {
    return this.players.filter((p) => !p.isBot);
  }

  canStart() {
    if (this.status !== "lobby") return false;
    if (this.mode === "singleplayer") return this.players.length >= 2;
    return this.players.length >= GAME.MIN_PLAYERS && this.players.every((p) => p.ready);
  }

  matchTimeRemaining(now = Date.now()) {
    if (!this.matchEndsAt) return this.durationMs;
    return Math.max(0, this.matchEndsAt - now);
  }

  serialize() {
    return {
      id: this.id,
      hostSocketId: this.hostSocketId,
      mode: this.mode,
      status: this.status,
      durationMs: this.durationMs,
      startedAt: this.startedAt,
      matchEndsAt: this.matchEndsAt,
      timeRemainingMs: this.matchTimeRemaining(),
      round: this.round,
      players: this.players.map((p) => ({
        id: p.id,
        socketId: p.socketId,
        name: p.name,
        seat: p.seat,
        ready: p.ready,
        connected: p.connected,
        isBot: p.isBot,
        botDifficulty: p.botDifficulty,
        cosmetics: p.cosmetics,
        score: p.score,
        streak: p.streak,
        roundState: p.roundState,
      })),
      lastMessages: this.messages,
      lastRoundWinner: this.lastRoundWinner,
    };
  }

  clearTimers() {
    if (this.timerTick) clearInterval(this.timerTick);
    if (this.roundTimeout) clearTimeout(this.roundTimeout);
    this.timerTick = null;
    this.roundTimeout = null;
    this.roundTimeoutDelayMs = 0;
    this.roundTimeoutStartedAt = 0;
    this.roundTimeoutCallback = null;
    for (const t of this.botTimeouts) clearTimeout(t);
    this.botTimeouts = [];
  }

  setRoundTimeout(callback, delayMs) {
    if (this.roundTimeout) clearTimeout(this.roundTimeout);
    this.roundTimeoutCallback = callback;
    this.roundTimeoutDelayMs = Math.max(0, delayMs);
    this.roundTimeoutStartedAt = Date.now();
    this.roundTimeout = setTimeout(callback, this.roundTimeoutDelayMs);
  }

  pause(actorName, io) {
    if (this.status === "paused" || this.status === "finished") return false;
    this.statusBeforePause = this.status;
    this.status = "paused";
    this.pauseStartedAt = Date.now();
    if (this.roundTimeout) {
      const elapsed = Date.now() - this.roundTimeoutStartedAt;
      this.pausedRoundRemainingMs = Math.max(0, this.roundTimeoutDelayMs - elapsed);
      clearTimeout(this.roundTimeout);
      this.roundTimeout = null;
    } else {
      this.pausedRoundRemainingMs = 0;
    }
    this.addMessage(`${actorName} paused the match.`);
    io.to(this.id).emit(EVENTS.GAME_PAUSED, { by: actorName });
    io.to(this.id).emit(EVENTS.SYSTEM_MESSAGE, { text: `${actorName} paused the match.` });
    return true;
  }

  resume(actorName, io) {
    if (this.status !== "paused") return false;
    const pausedFor = Date.now() - this.pauseStartedAt;
    this.accumulatedPauseMs += pausedFor;
    if (this.matchEndsAt) this.matchEndsAt += pausedFor;
    this.status = this.statusBeforePause || "in_round";
    this.pauseStartedAt = null;
    if (this.roundTimeoutCallback && this.pausedRoundRemainingMs > 0) {
      this.setRoundTimeout(this.roundTimeoutCallback, this.pausedRoundRemainingMs);
    }
    this.addMessage(`${actorName} resumed the match.`);
    io.to(this.id).emit(EVENTS.GAME_RESUMED, { by: actorName });
    io.to(this.id).emit(EVENTS.SYSTEM_MESSAGE, { text: `${actorName} resumed the match.` });
    return true;
  }

  resetRoundStates() {
    for (const p of this.players) p.roundState = defaultRoundState();
  }

  start(io) {
    this.status = "countdown";
    this.startedAt = Date.now();
    this.matchEndsAt = this.startedAt + this.durationMs;
    this.resetRoundStates();
    io.to(this.id).emit(EVENTS.MATCH_STARTED, { startAt: this.startedAt });
    this.scheduleRound(io, GAME.COUNTDOWN_MS);
    this.timerTick = setInterval(() => {
      if (this.status === "paused" || this.status === "finished") return;
      if (!this.isSuddenDeath && this.matchTimeRemaining() <= 0) {
        this.handleMatchEnd(io);
      } else {
        io.to(this.id).emit(EVENTS.ROOM_STATE, this.serialize());
      }
    }, 250);
  }

  scheduleRound(io, delayMs) {
    if (this.status === "finished") return;
    this.setRoundTimeout(() => this.beginRound(io), delayMs);
  }

  beginRound(io) {
    if (this.status === "paused" || this.status === "finished") return;
    this.status = "in_round";
    this.round.index += 1;
    this.round.phase = "countdown";
    this.round.signal = null;
    this.round.resolved = false;
    this.resetRoundStates();
    io.to(this.id).emit(EVENTS.ROUND_COUNTDOWN, { value: 3, roundIndex: this.round.index });
    io.to(this.id).emit(EVENTS.ROOM_STATE, this.serialize());
    this.setRoundTimeout(() => this.enterSuspense(io), 3000);
  }

  enterSuspense(io) {
    if (this.status === "paused" || this.status === "finished") return;
    this.round.phase = "suspense";
    io.to(this.id).emit(EVENTS.ROOM_STATE, this.serialize());
    const suspenseMs = randInt(GAME.SUSPENSE_MIN_MS, GAME.SUSPENSE_MAX_MS);
    this.setRoundTimeout(() => this.revealSignal(io), suspenseMs);
  }

  revealSignal(io) {
    if (this.status === "paused" || this.status === "finished") return;
    this.round.phase = "signal_live";
    this.round.signal = GAME.SIGNALS[randInt(0, GAME.SIGNALS.length - 1)];
    this.round.signalShownAt = Date.now();
    this.round.responseDeadlineAt = this.round.signalShownAt + randInt(GAME.RESPONSE_MIN_MS, GAME.RESPONSE_MAX_MS);
    io.to(this.id).emit(EVENTS.ROUND_SIGNAL, { signal: this.round.signal, deadlineAt: this.round.responseDeadlineAt });
    io.to(this.id).emit(EVENTS.ROOM_STATE, this.serialize());
    this.scheduleBots(io);
    this.setRoundTimeout(() => this.resolveRound(io), Math.max(100, this.round.responseDeadlineAt - Date.now()));
  }

  scheduleBots(io) {
    for (const player of this.players.filter((p) => p.isBot)) {
      const profileName = player.botDifficulty || "normal";
      const profile = BOT_PROFILES[profileName] || BOT_PROFILES.normal;
      if (Math.random() < profile.falseStartChance && this.round.phase === "suspense") {
        this.applyAction(player.socketId, "ArrowUp", io, true);
      }
      const action = chooseBotAction(profileName, this.round.signal);
      if (action.type === "miss") continue;
      const delay = randInt(profile.min, profile.max);
      const timeout = setTimeout(() => this.applyAction(player.socketId, action.key, io), delay);
      this.botTimeouts.push(timeout);
    }
  }

  applyAction(socketId, key, io, forcedEarly = false) {
    const player = this.getPlayer(socketId);
    if (!player || this.status === "paused" || this.status === "finished") return;
    if (player.roundState.answered || player.roundState.lockedOut) return;
    const now = Date.now();
    const beforeSignal = forcedEarly || this.round.phase === "countdown" || this.round.phase === "suspense";
    if (beforeSignal) {
      player.score -= 2;
      player.streak = 0;
      player.roundState.lockedOut = true;
      player.roundState.result = "false_start";
      io.to(this.id).emit(EVENTS.SYSTEM_MESSAGE, { text: `${player.name} false started.` });
      io.to(this.id).emit(EVENTS.SCORE_UPDATE, { players: this.serialize().players });
      return;
    }
    if (this.round.phase !== "signal_live") return;
    player.roundState.answered = true;
    player.roundState.answerAt = now;
    player.roundState.answerKey = key;
    const correct = key === this.round.signal;
    if (!correct) {
      player.score -= 1;
      player.streak = 0;
      player.roundState.result = "wrong";
    } else {
      player.roundState.result = "correct";
    }
    io.to(this.id).emit(EVENTS.SCORE_UPDATE, { players: this.serialize().players });
  }

  resolveRound(io) {
    if (this.status === "paused" || this.status === "finished") return;
    this.round.phase = "round_resolved";
    const correctPlayers = this.players
      .filter((p) => p.roundState.result === "correct")
      .sort((a, b) => a.roundState.answerAt - b.roundState.answerAt);
    if (correctPlayers.length > 0) {
      correctPlayers[0].score += 2;
      correctPlayers[0].streak += 1;
      correctPlayers[0].roundState.result = "winner";
      this.lastRoundWinner = correctPlayers[0].name;
      for (let i = 1; i < correctPlayers.length; i += 1) {
        correctPlayers[i].score += 1;
        correctPlayers[i].streak += 1;
      }
      for (const p of correctPlayers) {
        if (p.streak >= 3) p.score += 1;
      }
    } else {
      this.lastRoundWinner = null;
      for (const p of this.players) {
        if (p.roundState.result !== "wrong" && p.roundState.result !== "false_start") p.streak = 0;
      }
    }
    io.to(this.id).emit(EVENTS.ROUND_RESULT, { round: this.round, players: this.serialize().players, winner: this.lastRoundWinner });
    io.to(this.id).emit(EVENTS.ROOM_STATE, this.serialize());
    if (this.isSuddenDeath) {
      if (correctPlayers.length === 1) {
        this.status = "finished";
        this.clearTimers();
        io.to(this.id).emit(EVENTS.MATCH_FINISHED, { ranking: [...this.players].sort((a, b) => b.score - a.score).map((p) => ({ name: p.name, score: p.score })) });
        io.to(this.id).emit(EVENTS.ROOM_STATE, this.serialize());
        return;
      }
      this.setRoundTimeout(() => this.beginRound(io), GAME.BETWEEN_ROUND_MS);
      return;
    }
    if (this.matchTimeRemaining() <= 0) {
      this.handleMatchEnd(io);
      return;
    }
    this.setRoundTimeout(() => this.beginRound(io), GAME.BETWEEN_ROUND_MS);
  }

  handleMatchEnd(io) {
    const sorted = [...this.players].sort((a, b) => b.score - a.score);
    if (sorted.length < 2 || sorted[0].score !== sorted[1].score) {
      this.status = "finished";
      this.clearTimers();
      io.to(this.id).emit(EVENTS.MATCH_FINISHED, { ranking: sorted.map((p) => ({ name: p.name, score: p.score })) });
      io.to(this.id).emit(EVENTS.ROOM_STATE, this.serialize());
      return;
    }
    this.isSuddenDeath = true;
    this.status = "in_round";
    this.addMessage("Sudden death started.");
    io.to(this.id).emit(EVENTS.SYSTEM_MESSAGE, { text: "Sudden death started." });
    this.setRoundTimeout(() => this.beginRound(io), 300);
  }
}

module.exports = Game;