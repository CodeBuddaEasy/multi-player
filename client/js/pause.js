// pause.js — Pause menu, resume, and quit functionality
// Depends on: socket, gamePaused, latestGameState, timerInterval (from main.js)

// Toggle pause with Escape key
document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && document.getElementById('game-board').style.display === 'grid') {
        socket.emit(gamePaused ? 'RESUME_GAME' : 'PAUSE_GAME');
    }
});

// Resume button click
document.getElementById('resume-btn').addEventListener('click', () => {
    socket.emit('RESUME_GAME');
});

// Quit button click
document.getElementById('quit-btn').addEventListener('click', () => {
    socket.emit('QUIT_GAME');
    document.getElementById('pause-overlay').style.display = 'none';
});

// Game paused by any player
socket.on('GAME_PAUSED', (data) => {
    gamePaused = true;
    latestGameState = null;
    document.getElementById('pause-overlay').style.display = 'block';
    document.getElementById('pause-info').textContent = data.by + ' paused the game';

    // Freeze the timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
});

// Game resumed
socket.on('GAME_RESUMED', (data) => {
    gamePaused = false;
    document.getElementById('pause-overlay').style.display = 'none';
    socket.emit('REQUEST_STATE');
});

// Player quit notification
socket.on('PLAYER_QUIT', (data) => {
    document.getElementById('pause-info').textContent = data.name + ' quit the game';
});
