

const { TILES, GRID_WIDTH, GRID_HEIGHT } = require('../../shared/constants');

const DIRECTIONS = [
    { dir: 'ArrowUp',    dRow: -1, dCol:  0 },
    { dir: 'ArrowDown',  dRow:  1, dCol:  0 },
    { dir: 'ArrowLeft',  dRow:  0, dCol: -1 },
    { dir: 'ArrowRight', dRow:  0, dCol:  1 },
];

function inBounds(row, col) {
    return row >= 0 && row < GRID_HEIGHT && col >= 0 && col < GRID_WIDTH;
}

// Returns a Set of row and col keys that are on fire or within a bomb blast path
function getDangerTiles(game) {
    const danger = new Set();

    for (let r = 0; r < game.grid.length; r++) {
        for (let c = 0; c < game.grid[r].length; c++) {
            const tile = game.grid[r][c];
            if (tile === TILES.FIRE) {
                danger.add(`${r},${c}`);
            } else if (tile === TILES.BOMB) {
                // Use the actual range for this bomb nad fall back to 3 if missing
                const range = (game.bombRanges && game.bombRanges[`${r},${c}`]) || 3;
                danger.add(`${r},${c}`);
                for (const d of DIRECTIONS) {
                    for (let i = 1; i <= range; i++) {
                        const nr = r + d.dRow * i;
                        const nc = c + d.dCol * i;
                        if (!inBounds(nr, nc)) break;
                        const t = game.grid[nr][nc];
                        if (t === TILES.WALL) break;
                        danger.add(`${nr},${nc}`);
                        if (t === TILES.BOX) break;
                    }
                }
            }
        }
    }
    return danger;
}

// Returns walkable adjacent tiles, each flagged as safe or dangerous
function getSafeMoves(npc, game, danger = new Set()) {
    const moves = [];
    for (const d of DIRECTIONS) {
        const nr = npc.row + d.dRow;
        const nc = npc.col + d.dCol;
        if (!inBounds(nr, nc)) continue;
        const tile = game.grid[nr][nc];
        if (tile === TILES.WALL || tile === TILES.BOX || tile === TILES.BOMB) continue;
        const occupied = Object.values(game.players).some(p => p.alive && p.row === nr && p.col === nc);
        if (occupied) continue;
        moves.push({ dir: d.dir, row: nr, col: nc, safe: !danger.has(`${nr},${nc}`) });
    }
    return moves;
}


// Navigates through dangerous tiles if necessary, but stops at the closest non-danger tile.
function findSafeEscape(npc, game, danger) {
    const queue   = [{ row: npc.row, col: npc.col, firstDir: null, dist: 0 }];
    const visited = new Set([`${npc.row},${npc.col}`]);

    while (queue.length > 0) {
        const cur = queue.shift();
        for (const d of DIRECTIONS) {
            const nr  = cur.row + d.dRow;
            const nc  = cur.col + d.dCol;
            const key = `${nr},${nc}`;
            if (!inBounds(nr, nc) || visited.has(key)) continue;
            visited.add(key);
            const tile = game.grid[nr][nc];
            
            if (tile === TILES.WALL || tile === TILES.BOX || tile === TILES.BOMB || tile === TILES.FIRE) continue;
            const firstDir = cur.firstDir || d.dir;
            const dist     = cur.dist + 1;
            if (!danger.has(key)) return { dir: firstDir, dist }; 
            queue.push({ row: nr, col: nc, firstDir, dist }); 
        }
    }
    return null; // Completely trapped no safe escape exists
}


// prefers a live player over any box or powerup even if the player is farther away.
function findNearestTarget(npc, game, options = {}) {
    const { seekPowerups = false, danger = new Set(), playerBias = 0 } = options;

    const playerKeys = new Set(
        Object.values(game.players)
            .filter(p => p.alive && p.id !== npc.id)
            .map(p => `${p.row},${p.col}`)
    );

    const queue   = [{ row: npc.row, col: npc.col, firstDir: null, dist: 0 }];
    const visited = new Set([`${npc.row},${npc.col}`]);

    let nearestPlayer = null;
    let nearestOther  = null;

    while (queue.length > 0) {
        // Once we have both a player target and a non-player target we have enough to decide
        if (nearestPlayer && nearestOther) break;

        const cur = queue.shift();
        for (const d of DIRECTIONS) {
            const nr  = cur.row + d.dRow;
            const nc  = cur.col + d.dCol;
            const key = `${nr},${nc}`;
            if (!inBounds(nr, nc) || visited.has(key)) continue;
            visited.add(key);
            const tile = game.grid[nr][nc];
            // Walls, active bombs, fire, and blast-path tiles are all impassable for routing
            if (tile === TILES.WALL || tile === TILES.BOMB || tile === TILES.FIRE) continue;
            if (danger.has(key)) continue;
            const firstDir = cur.firstDir || d.dir;
            const dist     = cur.dist + 1;

            if (playerKeys.has(key)) {
                if (!nearestPlayer) nearestPlayer = { row: nr, col: nc, type: 'player', firstDir, dist };
            
            } else if (tile === TILES.BOX) {
                if (!nearestOther) nearestOther = { row: nr, col: nc, type: 'box', firstDir, dist };
             

            } else if (seekPowerups && (tile === TILES.POWERUP_BOMB_COUNT || tile === TILES.POWERUP_BOMB_RANGE)) {
                if (!nearestOther) nearestOther = { row: nr, col: nc, type: 'powerup', firstDir, dist };
                queue.push({ row: nr, col: nc, firstDir, dist }); 

            } else {
                queue.push({ row: nr, col: nc, firstDir, dist });
            }
        }
    }

    // Choose which target to pursue
    if (!nearestPlayer) return nearestOther;
    
    if (!nearestOther)  return nearestPlayer;
    
    if (nearestPlayer.dist <= nearestOther.dist) return nearestPlayer;
    
    return Math.random() < playerBias ? nearestPlayer : nearestOther;
}

// True if the NPC is standing on a tile that is currently dangerous
function isInDanger(npc, game, danger) {
    return danger.has(`${npc.row},${npc.col}`);
}

module.exports = { getDangerTiles, getSafeMoves, findNearestTarget, findSafeEscape, isInDanger, DIRECTIONS, inBounds };
