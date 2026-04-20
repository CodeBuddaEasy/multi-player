// client/js/renderer.js

const GRID_WIDTH = 15;
const GRID_HEIGHT = 15;
const CELL_SIZE = 60;
const PLAYER_SIZE = 75;
const PLAYER_GLOW_COLORS = ["#4488FF", "#FF4444", "#44CC44", "#FFAA00"];

const PLAYER_IMAGES = [
  "/assets/skins/skin-1.png",
  "/assets/skins/skin-2.png",
  "/assets/skins/skin-3.png",
  "/assets/skins/skin-4.png",
  "/assets/skins/skin-5.png",
  "/assets/skins/skin-6.png",
  "/assets/skins/skin-7.png",
  "/assets/skins/skin-8.png",
];

const boardElement = document.getElementById("game-board");

let domCells = [];
let playerElements = {};

function initBoard() {
  boardElement.style.display = "grid";
  boardElement.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, ${CELL_SIZE}px)`;
  boardElement.style.gridTemplateRows = `repeat(${GRID_HEIGHT}, ${CELL_SIZE}px)`;
  boardElement.style.position = "relative";

  for (let y = 0; y < GRID_HEIGHT; y++) {
    domCells[y] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = document.createElement("div");
      cell.className = "floor";
      boardElement.appendChild(cell);
      domCells[y][x] = cell;
    }
  }
}

function updateBoard(serverBoard) {
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const serverValue = serverBoard[y][x];
      const cell = domCells[y][x];

      if (serverValue === 1) {
        if (x === 0) cell.className = "wall-outer wall-outer-left";
        else if (x === GRID_WIDTH - 1)
          cell.className = "wall-outer wall-outer-right";
        else if (y === 0) cell.className = "wall-outer wall-outer-top";
        else if (y === GRID_HEIGHT - 1)
          cell.className = "wall-outer wall-outer-bottom";
        else cell.className = "wall";
        const img = cell.querySelector("img");
        if (img) img.remove();
      } else if (serverValue === 2) {
        if (!cell.className.startsWith("box")) {
          const variant = Math.floor(Math.random() * 3) + 1;
          cell.className = "box box-" + variant;
        }
        const img = cell.querySelector("img");
        if (img) img.remove();
      } else if (serverValue === 3) {
        cell.className = "floor bomb";
        if (!cell.querySelector("img.bomb-img")) {
          const img = document.createElement("img");
          img.className = "bomb-img";
          img.src = "/assets/textures/bomb-texture.png";
          cell.appendChild(img);
        }
      } else if (serverValue === 4) {
        cell.className = "floor fire";
        const img = cell.querySelector("img");
        if (img) img.remove();
      } else if (serverValue === 5) {
        cell.className = "floor powerup-bomb";
        if (!cell.querySelector("img.powerup-img")) {
          const img = cell.querySelector("img");
          if (img) img.remove();
          const pi = document.createElement("img");
          pi.className = "powerup-img";
          pi.src = "/assets/textures/powerup-texture.png";
          cell.appendChild(pi);
        }
      } else if (serverValue === 6) {
        cell.className = "floor powerup-range";
        if (!cell.querySelector("img.powerup-img")) {
          const img = cell.querySelector("img");
          if (img) img.remove();
          const pi = document.createElement("img");
          pi.className = "powerup-img";
          pi.src = "/assets/textures/powerup-range-texture.png";
          cell.appendChild(pi);
        }
      } else {
        cell.className = "floor";
        const img = cell.querySelector("img");
        if (img) img.remove();
      }
    }
  }
}

function updatePlayers(serverPlayers) {
  for (const id in playerElements) {
    if (!serverPlayers[id]) {
      playerElements[id].remove();
      delete playerElements[id];
    }
  }

  for (const playerId in serverPlayers) {
    const serverPlayer = serverPlayers[playerId];

    if (!playerElements[playerId]) {
      const playerDiv = document.createElement("div");
      playerDiv.className = "player player-" + serverPlayer.number;
      playerDiv.style.position = "absolute";
      playerDiv.style.width = PLAYER_SIZE + "px";
      playerDiv.style.height = PLAYER_SIZE + "px";
      playerDiv.style.transition = "transform 0.15s linear";
      playerDiv.style.zIndex = "10";

      const glowColor = PLAYER_GLOW_COLORS[serverPlayer.number] || "#FFD700";
      const skinIndex =
        serverPlayer.skinIndex !== undefined
          ? serverPlayer.skinIndex
          : serverPlayer.number;

      playerDiv.style.backgroundImage =
        "url('" + PLAYER_IMAGES[skinIndex] + "')";
      playerDiv.style.backgroundSize = "cover";
      playerDiv.style.backgroundPosition = "center";
      playerDiv.style.backgroundRepeat = "no-repeat";
      playerDiv.style.imageRendering = "pixelated";
      playerDiv.style.filter =
        "drop-shadow(0 0 12px " +
        glowColor +
        ") drop-shadow(0 0 8px " +
        glowColor +
        ")";

      const nameLabel = document.createElement("span");
      nameLabel.className = "player-name";
      nameLabel.textContent =
        serverPlayer.name || "P" + (serverPlayer.number + 1);
      nameLabel.style.position = "absolute";
      nameLabel.style.top = "-28px";
      nameLabel.style.left = "50%";
      nameLabel.style.transform = "translateX(-50%)";
      nameLabel.style.fontSize = "13px";
      nameLabel.style.fontWeight = "bold";
      nameLabel.style.color = "#fff";
      nameLabel.style.whiteSpace = "nowrap";
      nameLabel.style.textShadow =
        "0 0 8px " + glowColor + ", 2px 2px 4px #000";
      nameLabel.style.padding = "4px 12px";
      nameLabel.style.background =
        "linear-gradient(to bottom, " + glowColor + "66, " + glowColor + "44)";
      nameLabel.style.borderRadius = "8px";
      nameLabel.style.border = "2px solid " + glowColor;
      playerDiv.appendChild(nameLabel);

      boardElement.appendChild(playerDiv);
      playerElements[playerId] = playerDiv;
    }

    const pElement = playerElements[playerId];
    const offset = (PLAYER_SIZE - CELL_SIZE) / 2;
    const pixelX = serverPlayer.x * CELL_SIZE - offset;
    const pixelY = serverPlayer.y * CELL_SIZE - offset;

    pElement.style.transform =
      "translate3d(" + pixelX + "px, " + pixelY + "px, 0)";
    pElement.style.display = serverPlayer.alive ? "block" : "none";
  }
}
