

const { EVENTS } = require('../shared/constants');
const { createGrid } = require('./grid');

// All shared game state in one object (accessible from other modules)
const state = {
    grid: createGrid(),          // The current game grid
    players: {},                 // Connected players keyed by socket.id
    gameState: 'lobby',          // Current phase: 'lobby', 'starting', 'playing', 'over'
    readyPlayers: new Set(),     // Socket IDs of players who clicked ready/start
    countdownTimer: null,        // Reference to the countdown interval
    gamePaused: false,           // Whether the game is currently paused
    pausedBy: null,              // Name of player who paused
    pauseTime: null,            // Reference to the pause interval
    playerWins: {},              // Wins tracked by player number (persists across rounds)
    gameStartTime: null          // Timestamp when gameplay started (for timer)
};

// Build the game state payload sent to clients
function getStatePayload() {
    return {
        grid: state.grid,
        players: state.players,
        timer: state.gameStartTime ? Math.floor((Date.now() - state.gameStartTime) / 1000) : 0
    };
}

// Emit game state to a target (io for all players, socket for one player)
function emitGameState(target) {
    target.emit(EVENTS.GAME_STATE, getStatePayload());
}

// Start a countdown timer before the game begins
function startCountdown(seconds, io) {
    if (state.countdownTimer) clearInterval(state.countdownTimer);
    state.gameState = 'starting';
    let countdown = seconds;

    state.countdownTimer = setInterval(() => {
        // Broadcast countdown to all players
        io.emit(EVENTS.LOBBY_UPDATE, {
            countdown: countdown,
            ready: state.readyPlayers.size,
            players: Object.keys(state.players).length
        });
        countdown--;

        // Countdown finished — start the game
        if (countdown < 0) {
            clearInterval(state.countdownTimer);
            state.countdownTimer = null;
            state.readyPlayers.clear();
            state.gameState = 'playing';
            state.gameStartTime = Date.now();
            console.log('Game started!');
            emitGameState(io);
        }
    }, 1000);
}

module.exports = { state, getStatePayload, emitGameState, startCountdown };
