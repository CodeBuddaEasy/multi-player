function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const BOT_PROFILES = {
  easy: { min: 450, max: 800, wrongChance: 0.2, missChance: 0.2, falseStartChance: 0.04 },
  normal: { min: 300, max: 650, wrongChance: 0.12, missChance: 0.12, falseStartChance: 0.03 },
  hard: { min: 220, max: 500, wrongChance: 0.07, missChance: 0.08, falseStartChance: 0.02 },
};

function chooseBotAction(profileName, signal) {
  const p = BOT_PROFILES[profileName] || BOT_PROFILES.normal;
  const roll = Math.random();
  if (roll < p.missChance) return { type: "miss" };
  if (roll < p.missChance + p.wrongChance) {
    const alternatives = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].filter((k) => k !== signal);
    return { type: "key", key: alternatives[randInt(0, alternatives.length - 1)] };
  }
  return { type: "key", key: signal };
}

module.exports = {
  BOT_PROFILES,
  chooseBotAction,
  randInt,
};
