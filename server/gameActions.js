

const { TILES } = require('../shared/constants');
const { explodeBomb } = require('./bomb');

/**
 
 *
 * @param {object} game      - The Game instance
 * @param {string} playerId  - player.id  (socket.id for humans, 'npc-N' for bots)
 * @param {string} direction - 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
 * @param {object} io        - Socket.io server instance
 * @returns {boolean} true if the move happened, false if it was blocked
 */
function movePlayer(game, playerId, direction, io) {
    const player = game.players[playerId];
    if (!player || !player.alive) return false;

    let newRow = player.row;
    let newCol = player.col;

    switch (direction) {
        case 'ArrowUp':    newRow -= 1; break;
        case 'ArrowDown':  newRow += 1; break;
        case 'ArrowLeft':  newCol -= 1; break;
        case 'ArrowRight': newCol += 1; break;
        default: return false;
    }

    // Bounds check — prevents crashing on edge tiles
    const gridRow = game.grid[newRow];
    if (!gridRow) return false;
    const tile = gridRow[newCol];
    if (tile === undefined) return false;

    // Block if another alive player is already standing there
    const occupied = Object.values(game.players).some(
        (p) => p.alive && p.row === newRow && p.col === newCol
    );
    if (occupied) return false;

    // Walkable tile — plain floor or fire
    if (tile === TILES.FLOOR || tile === TILES.FIRE) {
        player.row = newRow;
        player.col = newCol;
        player.x   = newCol;
        player.y   = newRow;
        if (tile === TILES.FIRE) {
            player.alive = false;
        }
        game.emitGameState(io);
        return true;
    }

    // Powerup tile — collect it
    if (tile === TILES.POWERUP_BOMB_COUNT || tile === TILES.POWERUP_BOMB_RANGE) {
        player.row = newRow;
        player.col = newCol;
        player.x   = newCol;
        player.y   = newRow;

        if (tile === TILES.POWERUP_BOMB_COUNT) player.maxBombs++;
        else                                   player.bombRange++;

        game.grid[newRow][newCol] = TILES.FLOOR;

        io.to(game.id).emit('POWERUP_COLLECTED', {
            playerId:   player.id,
            playerName: player.name,
            powerupType: tile === TILES.POWERUP_BOMB_COUNT ? 'bomb' : 'range',
        });

        game.emitGameState(io);
        return true;
    }

    // WALL, BOX, BOMB — blocked
    return false;
}

/**

 *
 * @param {object} game      - The Game instance
 * @param {string} playerId  - player.id (socket.id for humans, 'npc-N' for bots)
 * @param {object} io        - Socket.io server instance
 * @returns {boolean} true if bomb was placed, false if not allowed
 */
function placeBomb(game, playerId, io) {
    const player = game.players[playerId];
    if (!player || !player.alive) return false;
    if (player.activeBombs >= player.maxBombs) return false;
    if (game.grid[player.row][player.col] === TILES.BOMB) return false;

    player.activeBombs++;
    game.grid[player.row][player.col] = TILES.BOMB;
    if (!game.bombRanges) game.bombRanges = {};
    game.bombRanges[`${player.row},${player.col}`] = player.bombRange;
    game.emitGameState(io);

    const bombRow   = player.row;
    const bombCol   = player.col;
    const bombRange = player.bombRange;

    setTimeout(function tryExplode() {
        if (game.gamePaused) {
            setTimeout(tryExplode, 100);
            return;
        }
        if (player.activeBombs > 0) player.activeBombs--;
        explodeBomb(bombRow, bombCol, bombRange, game, io, playerId);
    }, 3000);

    return true;
}

module.exports = { movePlayer, placeBomb };
