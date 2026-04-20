// client/js/ui.js
// Handles UI updates for the sidebar

function updatePlayerCards(players) {
  const playerArray = Object.values(players).sort(
    (a, b) => a.number - b.number,
  );

  playerArray.forEach((player, index) => {
    const cardNum = index + 1;
    const card = document.getElementById(`player-card-${cardNum}`);
    if (card) {
      card.style.display = "flex";

      // Set skin image on avatar
      const skinIndex =
        player.skinIndex !== undefined ? player.skinIndex : player.number;
      const avatar = card.querySelector(".player-avatar");
      if (avatar) {
        avatar.style.backgroundImage = `url('/assets/skins/skin-${skinIndex + 1}.png')`;
        avatar.style.backgroundSize = "contain";
        avatar.style.backgroundRepeat = "no-repeat";
        avatar.style.backgroundPosition = "center";
      }

      // Update name — append a BOT badge for NPC players
      const nameEl = card.querySelector(".player-card-name");
      if (nameEl) {
        const badge = player.isNPC ? ' <span class="bot-badge">BOT</span>' : '';
        nameEl.innerHTML = (player.name || `PLAYER ${player.number + 1}`) + badge;
      }

      // Update score
      const winsEl = card.querySelector(".player-score");
      if (winsEl) winsEl.textContent = `Boxes: ${player.boxesDestroyed || 0}`;

      // Player colour class and dead state
      card.className = `player-card player-${player.number + 1}`;
      if (!player.alive) card.classList.add("dead");
    }
  });

  // Hide unused player cards
  for (let i = playerArray.length + 1; i <= 4; i++) {
    const card = document.getElementById(`player-card-${i}`);
    if (card) card.style.display = "none";
  }
}

// Update timer display
function updateTimerDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  document.getElementById("game-timer-display").textContent = display;
}

// Music toggle
const musicBtn = document.getElementById("music-toggle-btn");
musicBtn.classList.add("active");
musicBtn.addEventListener("click", () => {
  const isEnabled = toggleMusic();
  if (isEnabled) {
    musicBtn.classList.add("active");
  } else {
    musicBtn.classList.remove("active");
  }
});

// FX toggle
const fxBtn = document.getElementById("fx-toggle-btn");
fxBtn.classList.add("active");
fxBtn.addEventListener("click", () => {
  const isEnabled = toggleSFX();
  if (isEnabled) {
    fxBtn.classList.add("active");
  } else {
    fxBtn.classList.remove("active");
  }
});

// Quit button
document.getElementById("quit-game-btn").addEventListener("click", () => {
  if (confirm("Are you sure you want to quit?")) {
    socket.emit("QUIT_GAME");
    location.reload();
  }
});
