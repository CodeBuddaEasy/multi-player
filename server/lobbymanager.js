const Game = require("./game");

class LobbyManager {
  constructor() {
    this.lobbies = new Map();
  }

  createLobby(hostSocketId, mode = "multiplayer") {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const game = new Game(id, hostSocketId, mode);
    this.lobbies.set(id, game);
    return game;
  }

  getLobby(id) {
    return this.lobbies.get((id || "").toUpperCase());
  }

  removeLobby(id) {
    const room = this.getLobby(id);
    if (room) room.clearTimers();
    this.lobbies.delete((id || "").toUpperCase());
  }

  getLobbyBySocketId(socketId) {
    for (const game of this.lobbies.values()) {
      if (game.players.some((p) => p.socketId === socketId)) return game;
    }
    return null;
  }
}

module.exports = new LobbyManager();