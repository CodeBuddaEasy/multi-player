// bomb.js — Bomb explosion logic, kill detection, and win checking

const { EVENTS, TILES } = require('../shared/constants');
const { clearFire } = require('./grid');

// Handle a bomb exploding at the given position
function explodeBomb(row, col, range, game, io, ownerId) {
    // If game isn't being played, don't explode the bomb.
    if (game.gameState !== 'playing') return;

    // Remove the bomb's range record — it no longer needs to be tracked
    if (game.bombRanges) delete game.bombRanges[`${row},${col}`];

    // Directions the fire spreads (up, down, left, right)
    const directions = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 }
    ];

    // Place fire at the bomb's position
    game.grid[row][col] = TILES.FIRE;

    const drops = []; // Store power-ups to place after fire clears

    for (const dir of directions) {
        for (let i = 1; i <= range; i++) {
            const newRow = row + (dir.row * i);
            const newCol = col + (dir.col * i);

            // Check bounds (optional if grid assumes walls around, but good for safety)
            if (newRow < 0 || newRow >= game.grid.length || newCol < 0 || newCol >= game.grid[0].length) break;

            const tile = game.grid[newRow][newCol];

            if (tile === TILES.WALL) {
                break; // Stop at wall
            }

            if (tile === TILES.BOX) {
                game.grid[newRow][newCol] = TILES.FIRE;

                // Increment score for the bomb owner
                // ownerId might be a socket ID or player number? 
                // Let's pass socket ID to be safe, then look up player
                if (ownerId && game.players[ownerId]) {
                    const player = game.players[ownerId];
                    player.boxesDestroyed = (player.boxesDestroyed || 0) + 1;
                    game.playerBoxScores[player.number] = player.boxesDestroyed;
                    // console.log(`[${game.id}] Player ${player.number} broke a box! Score: ${player.boxesDestroyed}`);
                }

                // Chance to drop power-up
                if (Math.random() < 0.3) {
                    const type = Math.random() < 0.5 ? TILES.POWERUP_BOMB_COUNT : TILES.POWERUP_BOMB_RANGE;
                    drops.push({ row: newRow, col: newCol, type: type });
                }
                break; // Stop at box (it breaks)
            }

            // If it's a powerup or floor or fire, turn/keep as fire and continue
            game.grid[newRow][newCol] = TILES.FIRE;
        }
    }

    // Send updated grid to all players
    game.emitGameState(io);

    // Tell clients to play explosion sound
    io.to(game.id).emit('EXPLOSION');

    // Check if any alive player is standing on fire
    for (const id in game.players) {
        const p = game.players[id];
        if (game.grid[p.row][p.col] === TILES.FIRE && p.alive) {
            p.alive = false;
            console.log(`[${game.id}] Player ${p.number} killed by bomb`);
            // Tell clients to play death sound
            io.to(game.id).emit('PLAYER_DIED', { name: p.name || 'Player ' + p.number });
        }
    }

    // Check for winner (last player standing)
    const alivePlayers = Object.values(game.players).filter(p => p.alive);
    console.log(`[${game.id}] CHECK WIN: Alive=${alivePlayers.length}, State=${game.gameState}, Total=${Object.keys(game.players).length}`);

    if (alivePlayers.length <= 1 && Object.keys(game.players).length > 1 && game.gameState === 'playing') {
        game.gameState = 'over';

        let winnerName = 'No one';
        let winnerId = null;
        let wins = 0;

        if (alivePlayers.length === 1) {
            const winner = alivePlayers[0];
            winner.wins++;
            game.playerWins[winner.number] = winner.wins;
            winnerName = winner.name;
            winnerId = winner.number;
            wins = winner.wins;
            console.log(`[${game.id}] Winner: ${winnerName}`);
        } else {
            console.log(`[${game.id}] Draw! Everyone died.`);
        }

        io.to(game.id).emit(EVENTS.GAME_OVER, {
            winner: winnerId,
            winnerName: winnerName,
            wins: wins
        });
    }

    // Clear fire after 0.5 seconds so it's visible briefly
    setTimeout(function tryClear() {
        if (game.gamePaused) {
            setTimeout(tryClear, 100);
            return;
        }
        clearFire(game.grid);

        // Place drops
        drops.forEach(drop => {
            // Only place if it's currently floor (don't overwrite a player or new bomb if that happened)
            if (game.grid[drop.row][drop.col] === TILES.FLOOR) {
                game.grid[drop.row][drop.col] = drop.type;
            }
        });

        if (game.gameState !== 'over') {
            game.emitGameState(io);
        }
    }, 500);
}

module.exports = { explodeBomb };
