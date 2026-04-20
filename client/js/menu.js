// menu.js — Main menu interactions and mode selection

const mainMenu  = document.getElementById("main-menu");
const lobbyProps = document.getElementById("lobby");
const errorMsg  = document.getElementById("error-msg");

// Tracks whether we're creating a single-player or multiplayer lobby
window.isSinglePlayer = false;

// Inject the mode toggle above the Create Game section
(function buildModeToggle() {
    const toggle = document.createElement('div');
    toggle.id = 'mode-toggle';
    toggle.innerHTML = `
        <button class="mode-btn mode-active" id="btn-multi">Multiplayer</button>
        <button class="mode-btn" id="btn-single">Single Player</button>
    `;
    const createSection = document.querySelector('.menu-section');
    mainMenu.insertBefore(toggle, createSection);

    document.getElementById('btn-multi').addEventListener('click', () => {
        window.isSinglePlayer = false;
        document.getElementById('btn-multi').classList.add('mode-active');
        document.getElementById('btn-single').classList.remove('mode-active');
        document.getElementById('join-section').style.display = '';
    });

    document.getElementById('btn-single').addEventListener('click', () => {
        window.isSinglePlayer = true;
        document.getElementById('btn-single').classList.add('mode-active');
        document.getElementById('btn-multi').classList.remove('mode-active');
        document.getElementById('join-section').style.display = 'none';
    });
})();

// Helper to show errors
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
  setTimeout(() => {
    errorMsg.style.display = "none";
  }, 3000);
}

// Create Game — passes the current mode to the server
document.getElementById("create-btn").addEventListener("click", () => {
  const nameInput = document.getElementById("create-name");
  const passInput = document.getElementById("create-password");

  const name     = nameInput.value.trim();
  const password = passInput.value.trim();

  if (!name) {
    showError("Please enter a Lobby Name.");
    return;
  }

  socket.emit("CREATE_LOBBY", {
    name,
    password,
    mode: window.isSinglePlayer ? 'single' : 'multi',
  });
});

// Join Game
document.getElementById("join-btn").addEventListener("click", () => {
  const idInput = document.getElementById("join-id");
  const passInput = document.getElementById("join-password");

  const lobbyId = idInput.value.trim().toUpperCase();
  const password = passInput.value.trim();

  if (!lobbyId) {
    showError("Please enter a Lobby ID.");
    return;
  }

  socket.emit("JOIN_LOBBY", { lobbyId, password });
});

// Server Responses

socket.on("LOBBY_JOINED", (data) => {
  mainMenu.style.display  = "none";
  lobbyProps.style.display = "flex";
  document.getElementById("lobby-title").textContent = data.lobbyId;

  // Hide the copy-link button in single-player — sharing the link is pointless
  if (data.isSinglePlayer) {
    const copyBtn = document.getElementById("copy-link-btn");
    if (copyBtn) copyBtn.style.display = "none";
  }

  console.log("Joined Lobby:", data.lobbyId);
});

socket.on("LOBBY_ERROR", (msg) => {
  showError(msg);
});

// Check for URL parameters
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const lobbyParam = urlParams.get("lobby") || urlParams.get("box");

  if (lobbyParam) {
    const joinInput = document.getElementById("join-id");
    joinInput.value = lobbyParam;

    // Auto-click join button
    const joinBtn = document.getElementById("join-btn");
    if (joinBtn) {
      // Small delay to ensure socket is ready/listeners attached
      setTimeout(() => {
        joinBtn.click();
      }, 100);
    }
  }
});
