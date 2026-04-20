function formatDebugSnapshot(room, fps, pingMs) {
  if (!room) return "No room";
  return [
    `room: ${room.id}`,
    `phase: ${room.round.phase}`,
    `signal: ${room.round.signal || "-"}`,
    `players: ${room.players.length}`,
    `lastWinner: ${room.lastRoundWinner || "-"}`,
    `fps: ${fps}`,
    `ping: ${pingMs}ms`,
  ].join("\n");
}

window.ReactionArenaDebug = { formatDebugSnapshot };
