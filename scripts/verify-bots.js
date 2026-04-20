const { chooseBotAction, BOT_PROFILES } = require("../server/botAI");

function run() {
  const signal = "ArrowRight";
  ["easy", "normal", "hard"].forEach((level) => {
    const profile = BOT_PROFILES[level];
    let misses = 0;
    let wrong = 0;
    let correct = 0;
    for (let i = 0; i < 500; i += 1) {
      const decision = chooseBotAction(level, signal);
      if (decision.type === "miss") misses += 1;
      else if (decision.key !== signal) wrong += 1;
      else correct += 1;
    }
    if (profile.min >= profile.max) throw new Error(`Invalid profile range for ${level}`);
    console.log(`${level}: correct=${correct} wrong=${wrong} miss=${misses}`);
  });
  console.log("verify-bots: OK");
}

run();
