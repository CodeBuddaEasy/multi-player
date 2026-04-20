// client/js/sound.js - Sound effects and music manager

// Sound Effects
const sfx = {
  start: new Audio("/sounds/sound when clicking start.mp3"),
  explosion: new Audio("/sounds/bomb explison.mp3"),
  death: new Audio("/sounds/deadth sound.mp3"),
  powerup: new Audio("/sounds/power-up.wav"),
};

// Set individual volumes for each sound
sfx.start.volume = 0.5;
sfx.explosion.volume = 0.2;
sfx.death.volume = 0.4;
sfx.powerup.volume = 0.6;

// Track if SFX are enabled
let sfxEnabled = true;

// Play a sound effect (resets if already playing)
function playSound(name) {
  if (sfx[name] && sfxEnabled) {
    sfx[name].currentTime = 0;
    sfx[name].play().catch(() => {});
  }
}

// Make playSound globally accessible
window.playSound = playSound;

// Background Music
const gameMusic = new Audio("/sounds/game-music.mp3");
gameMusic.loop = true;
gameMusic.volume = 0.3;

let musicEnabled = true;

// Start game music
function startGameMusic() {
  if (!musicEnabled) return;
  gameMusic.currentTime = 0;
  gameMusic.play().catch((err) => {
    console.log("Music autoplay prevented:", err);
  });
}

// Stop game music
function stopGameMusic() {
  gameMusic.pause();
  gameMusic.currentTime = 0;
}

// Toggle music on/off
function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (!musicEnabled) {
    stopGameMusic();
  } else {
    startGameMusic();
  }
  return musicEnabled;
}

// Toggle SFX on/off
function toggleSFX() {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
}

// Make functions globally accessible
window.startGameMusic = startGameMusic;
window.stopGameMusic = stopGameMusic;
window.toggleMusic = toggleMusic;
window.toggleSFX = toggleSFX;

// Empty menu music function (for compatibility)
function startMenuMusic() {}
window.startMenuMusic = startMenuMusic;

// Listen for sound events from server
socket.on("EXPLOSION", () => {
  playSound("explosion");
});

socket.on("PLAYER_DIED", (data) => {
  setTimeout(() => {
    playSound("death");
  }, 300);
});

// Listen for powerup pickup event
socket.on("POWERUP_COLLECTED", (data) => {
  playSound("powerup");
});