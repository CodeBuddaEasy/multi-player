// client/js/lobby.js
// Lobby UI, skin selection, player names, game start, and game over handling

const playerListEl = document.getElementById("player-list");
const copyLinkBtn = document.getElementById("copy-link-btn");

// ===== SKIN SELECTION =====
const SKINS = [
  { name: "BOBER", src: "/assets/skins/skin-1.png" },
  { name: "PINGVIN", src: "/assets/skins/skin-2.png" },
  { name: "SKUUNKS", src: "/assets/skins/skin-3.png" },
  { name: "RATATOUILLE", src: "/assets/skins/skin-4.png" },
  { name: "JEŻYK", src: "/assets/skins/skin-5.png" },
  { name: "USSIK", src: "/assets/skins/skin-6.png" },
  { name: "CHOMIK", src: "/assets/skins/skin-7.png" },
  { name: "FREDDY", src: "/assets/skins/skin-8.png" },
];

let selectedSkinIndex = 0;
const PLAYER_COLOR_CLASSES = ["color-1", "color-2", "color-3", "color-4"];
let myPlayerNumber = 0;

function updateSkinPreview() {
  const skin = SKINS[selectedSkinIndex];
  const img = document.getElementById("skin-preview-img");
  const nameEl = document.getElementById("skin-name-display");
  const container = document.getElementById("skin-preview-container");

  if (img) img.src = skin.src;
  if (nameEl) nameEl.textContent = skin.name;

  if (container) {
    PLAYER_COLOR_CLASSES.forEach((c) => container.classList.remove(c));
    container.classList.add(PLAYER_COLOR_CLASSES[myPlayerNumber] || "color-1");
  }
}

document.getElementById("skin-prev").addEventListener("click", () => {
  selectedSkinIndex = (selectedSkinIndex - 1 + SKINS.length) % SKINS.length;
  updateSkinPreview();
  socket.emit("SET_SKIN", { skinIndex: selectedSkinIndex });
});

document.getElementById("skin-next").addEventListener("click", () => {
  selectedSkinIndex = (selectedSkinIndex + 1) % SKINS.length;
  updateSkinPreview();
  socket.emit("SET_SKIN", { skinIndex: selectedSkinIndex });
});

updateSkinPreview();

// ===== PLAYER COLOURS =====
const PLAYER_COLORS = {
  0: { border: "#4488FF", glow: "0 0 10px #4488FF, 0 0 30px #0044cc" },
  1: { border: "#FF4444", glow: "0 0 10px #FF4444, 0 0 30px #cc0000" },
  2: { border: "#44CC44", glow: "0 0 10px #44CC44, 0 0 30px #228822" },
  3: { border: "#FFAA00", glow: "0 0 10px #FFAA00, 0 0 30px #cc8800" },
};

// ===== COPY LINK =====
let currentLobbyId = null;

if (copyLinkBtn) {
  copyLinkBtn.addEventListener("click", () => {
    if (currentLobbyId) {
      const url = `${window.location.origin}/?lobby=${currentLobbyId}`;
      navigator.clipboard
        .writeText(url)
        .then(() => {
          const originalText = copyLinkBtn.textContent;
          copyLinkBtn.textContent = "✔ Copied!";
          setTimeout(() => {
            copyLinkBtn.textContent = originalText;
          }, 2000);
        })
        .catch((err) => console.error("Failed to copy:", err));
    }
  });
}

// ===== LOBBY JOINED =====
socket.on("LOBBY_JOINED", (data) => {
  myPlayerNumber = data.playerId || 0;
  currentLobbyId = data.lobbyId;
  // Sync mode flag from the server so it's always authoritative
  window.isSinglePlayer = !!data.isSinglePlayer;
  updateSkinPreview();
  // Show NPC config panel if single-player
  if (window.initNPCConfig) window.initNPCConfig();
});

// ===== LOBBY UPDATE =====
socket.on("LOBBY_UPDATE", (data) => {
  if (data.players && Array.isArray(data.players)) {
    const sorted = [...data.players].sort((a, b) => a.number - b.number);
    const others = sorted.filter((p) => p.number !== myPlayerNumber);

    for (let i = 0; i < 3; i++) {
      const slotEl = document.getElementById(`lobby-slot-${i + 1}`);
      if (!slotEl) continue;

      const player = others[i];

      if (player) {
        // Active slot — apply player's colour
        const col = PLAYER_COLORS[player.number] || PLAYER_COLORS[0];
        slotEl.style.borderColor = col.border;
        slotEl.style.boxShadow = col.glow;
        slotEl.classList.remove("slot-empty");

        const skinSrc =
          player.skinIndex !== undefined && SKINS[player.skinIndex]
            ? SKINS[player.skinIndex].src
            : SKINS[player.number % SKINS.length].src;

        const isReady     = player.ready;
        const displayName = player.name || `PLAYER ${player.number + 1}`;
        const skinBg      = ["#1a3060", "#3d1010", "#1a3a1a", "#3d2e00"][player.number] || "#1a1a2e";
        const botBadge    = player.isNPC
            ? `<span class="bot-badge">${(player.difficulty || 'bot').toUpperCase()}</span>`
            : '';

        slotEl.innerHTML = `
          <span class="slot-title" style="color:${col.border}; text-shadow: 0 0 8px ${col.border};">
            ${displayName}${botBadge}
          </span>
          <div class="slot-skin-preview" style="background:${skinBg}; border-color:${col.border};">
            <img class="slot-skin-large" src="${skinSrc}" alt="skin" />
          </div>
          <span class="slot-player-status ${isReady ? "status-ready" : "status-not-ready"}">
            ${isReady ? "READY" : "NOT READY"}
          </span>`;
      } else {
        // Empty slot — greyed out, no glow
        slotEl.style.borderColor = "#444";
        slotEl.style.boxShadow = "none";
        slotEl.classList.add("slot-empty");

        const defaultLabels = ["PLAYER 2", "PLAYER 3", "PLAYER 4"];
        slotEl.innerHTML = `
          <span class="slot-title" style="color:#555; text-shadow:none;">
            ${defaultLabels[i]}
          </span>
          <div class="slot-skin-preview slot-skin-empty">
            <span class="slot-waiting">Waiting...</span>
          </div>
          <span class="slot-player-status status-not-ready" style="opacity:0.3;"> NOT READY</span>`;
      }
    }
  }

  // Status text
  if (data.countdown !== undefined) {
    document.getElementById("lobby-status").textContent =
      `Starting in ${data.countdown}...`;
  } else {
    document.getElementById("lobby-status").textContent =
      `Players: ${data.readyCount || 0}/${data.total || 0} Ready`;
  }

  if (!isReady) {
    document.getElementById("start-btn").textContent = "READY";
  }
});

// ===== START / CONTINUE BUTTON =====
document.getElementById("start-btn").addEventListener("click", () => {
  playSound("start");
  if (document.getElementById("start-btn").textContent === "Continue") {
    socket.emit("PLAY_AGAIN");
    document.getElementById("leave-btn").style.display = "none";
    document.getElementById("lobby-status").textContent = "Waiting for players...";
    const editBtn = document.getElementById("edit-bots-btn");
    if (editBtn) editBtn.style.display = "none";
    isReady = false;
  } else {
    const btn = document.getElementById("start-btn");
    if (!btn.classList.contains("name-set")) return;
    const npcConfigs = window.getNPCConfigs ? window.getNPCConfigs() : [];
    socket.emit("START_GAME", { npcConfigs });
    isReady = true;
    btn.disabled = true;
    btn.textContent = "WAITING...";
  }
});

socket.on("START_ERROR", (msg) => {
  document.getElementById("lobby-status").textContent = msg;
  document.getElementById("start-btn").disabled = false;
  document.getElementById("start-btn").textContent = "READY";
  isReady = false;
});

// ===== NAME INPUT =====
document.getElementById("set-name-btn").addEventListener("click", () => {
  const name = document.getElementById("name-input").value.trim();
  if (name) {
    socket.emit("SET_NAME", name);
    document.getElementById("name-input").disabled = true;
    document.getElementById("set-name-btn").disabled = true;
    document.getElementById("set-name-btn").textContent = "✔ " + name;
    document.getElementById("name-error").style.display = "none";
    const readyBtn = document.getElementById("start-btn");
    readyBtn.classList.add("name-set");
    readyBtn.disabled = false;
    startMenuMusic();
  }
});

socket.on("NAME_ERROR", (msg) => {
  document.getElementById("name-error").textContent = msg;
  document.getElementById("name-error").style.display = "block";
  document.getElementById("name-input").disabled = false;
  document.getElementById("set-name-btn").disabled = false;
  document.getElementById("set-name-btn").textContent = "Set Name";
  document.getElementById("start-btn").classList.remove("name-set");
});

// ===== GAME OVER =====
socket.on("GAME_OVER", (data) => {
  document.getElementById("game-container").style.display = "none";
  document.getElementById("main-menu").style.display = "none";
  document.getElementById("lobby").style.display = "flex";
  document.getElementById("spectate-msg").style.display = "none";
  document.getElementById("pause-overlay").style.display = "none";

  stopGameMusic();
  startMenuMusic();

  isReady = false;
  boardInitialized = false;
  latestGameState = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (document.getElementById("game-timer-display")) {
    document.getElementById("game-timer-display").textContent = "0:00";
  }

  document.getElementById("name-input-area").style.display = "block";
  document.getElementById("name-input").disabled = false;
  document.getElementById("name-input").value = "";
  document.getElementById("set-name-btn").disabled = false;
  document.getElementById("set-name-btn").textContent = "Set Name";
  document.getElementById("name-error").style.display = "none";

  document.getElementById("lobby-status").textContent =
    data.winnerName + " wins! 🏆 (" + data.wins + " total wins)";
  const startBtn = document.getElementById("start-btn");
  startBtn.textContent = "Continue";
  startBtn.disabled = false;
  startBtn.classList.add("name-set");
  document.getElementById("leave-btn").style.display = "block";

  // In single-player, also show an "Edit Bots" button
  if (window.isSinglePlayer) {
    let editBtn = document.getElementById("edit-bots-btn");
    if (!editBtn) {
      editBtn = document.createElement("button");
      editBtn.id = "edit-bots-btn";
      editBtn.className = "ready-btn";
      editBtn.style.marginTop = "8px";
      startBtn.parentNode.insertBefore(editBtn, startBtn.nextSibling);
      editBtn.addEventListener("click", () => {
        socket.emit("PLAY_AGAIN");
        isReady = false;
        editBtn.style.display = "none";
        if (window.resetNPCConfig) window.resetNPCConfig();
      });
    }
    editBtn.textContent = "Edit Bots";
    editBtn.style.display = "block";
  }
});

// ===== LEAVE BUTTON =====
document.getElementById("leave-btn").addEventListener("click", () => {
  document.getElementById("leave-btn").style.display = "none";
  document.getElementById("start-btn").style.display = "none";
  location.reload();
});
