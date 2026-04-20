const Game = require("../server/game");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function fakeIo() {
  return { to: () => ({ emit: () => {} }) };
}

function run() {
  const game = new Game("TEST1", "host", "multiplayer");
  game.addPlayer({ id: "host", name: "A", cosmetics: { hatColor: "red", footwear: "boots", badge: "none", codingAffinity: "casual" } });
  game.addPlayer({ id: "p2", name: "B", cosmetics: { hatColor: "white", footwear: "sneakers", badge: "none", codingAffinity: "casual" } });
  game.round.phase = "signal_live";
  game.round.signal = "ArrowUp";
  game.applyAction("host", "ArrowUp", fakeIo());
  game.applyAction("p2", "ArrowLeft", fakeIo());
  game.resolveRound(fakeIo());
  const a = game.getPlayer("host");
  const b = game.getPlayer("p2");
  assert(a.score >= 2, "Host should gain points for correct fastest input");
  assert(b.score <= -1, "Wrong answer should apply penalty");
  game.clearTimers();
  console.log("verify-round-logic: OK");
}

run();
