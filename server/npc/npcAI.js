

const { getDangerTiles, getSafeMoves, findNearestTarget, findSafeEscape, isInDanger, DIRECTIONS, inBounds } = require('./pathfinding');
const { TILES } = require('../../shared/constants');

// Converts the three 1–10 sliders into runtime behaviour parameters
function npcConfig(npc) {
    const spd = npc.speed      || 5;
    const agg = npc.aggression || 5;
    const aim = npc.accuracy   || 5;
    return {
        bombChance:        0.10 + (agg - 1) * (0.85 / 9),   
        randomMoveChance:  0.50 - (aim - 1) * (0.48 / 9),   
        canCollectPowerups: aim >= 5,
        playerBias:        (agg - 1) / 9,                    
    };
}

// Returns  action, direction?, priority, reason priority/reason are for debug logging
function decideAction(npc, game) {
    const config  = npcConfig(npc);
    const danger  = getDangerTiles(game);
    const moves   = getSafeMoves(npc, game, danger);
    const safes   = moves.filter(m => m.safe);
    const pool    = safes.length > 0 ? safes : moves;

    // Priority 1: flee if currently on a dangerous tile 
    if (isInDanger(npc, game, danger)) {
        const escape = findSafeEscape(npc, game, danger);
        if (escape) return { action: 'move', direction: escape.dir, priority: 1, reason: `flee→${escape.dir}` };
        if (moves.length > 0) {
            const dir = moves[Math.floor(Math.random() * moves.length)].dir;
            return { action: 'move', direction: dir, priority: 1, reason: `flee-trapped→${dir}` };
        }
        return { action: 'idle', priority: 1, reason: 'flee-no-moves' };
    }

    // Priority 2: place bomb when a target is within blast range and there is a safe escape.
    // Player in range → always attempt (deliberate attack, no random gate).
    // Box in range only → gate with bombChance so wall-clearing feels natural, not robotic.
    if (npc.activeBombs < npc.maxBombs) {
        const bombRange = npc.bombRange || 1;

        // Is a live enemy player within blast range?
        const playerInRange = DIRECTIONS.some(d => {
            for (let i = 1; i <= bombRange; i++) {
                const nr = npc.row + d.dRow * i;
                const nc = npc.col + d.dCol * i;
                if (!inBounds(nr, nc)) break;
                const tile = game.grid[nr][nc];
                if (tile === TILES.WALL) break;
                if (Object.values(game.players).some(
                    p => p.alive && p.id !== npc.id && p.row === nr && p.col === nc
                )) return true;
                if (tile !== TILES.FLOOR) break;
            }
            return false;
        });

        // Is a box within blast range and no player already targeted?
        const boxInRange = !playerInRange && Math.random() < config.bombChance && DIRECTIONS.some(d => {
            for (let i = 1; i <= bombRange; i++) {
                const nr = npc.row + d.dRow * i;
                const nc = npc.col + d.dCol * i;
                if (!inBounds(nr, nc)) break;
                const tile = game.grid[nr][nc];
                if (tile === TILES.WALL) break;
                if (tile === TILES.BOX) return true;
                if (tile !== TILES.FLOOR) break;
            }
            return false;
        });

        if (playerInRange || boxInRange) {
            // Build a simulated danger set existing danger + this bombs own blast radius
            const simDanger = new Set(danger);
            simDanger.add(`${npc.row},${npc.col}`);
            for (const d of DIRECTIONS) {
                for (let i = 1; i <= bombRange; i++) {
                    const nr = npc.row + d.dRow * i;
                    const nc = npc.col + d.dCol * i;
                    if (!inBounds(nr, nc)) break;
                    const tile = game.grid[nr][nc];
                    if (tile === TILES.WALL) break;
                    simDanger.add(`${nr},${nc}`);
                    if (tile === TILES.BOX) break;
                }
            }
            // Only place the bombs if the NPC can reach safety before detonation with a 3 sec timer.
            // availableTicks = how many NPC moves fit inside the bomb timer.
            const tickRate       = Math.round(1000 - ((npc.speed || 5) - 1) * (650 / 9));
            const availableTicks = Math.floor(3000 / tickRate);
            const escape = findSafeEscape(npc, game, simDanger);
            if (escape !== null && escape.dist <= availableTicks) {
                return { action: 'bomb', priority: 2, reason: playerInRange ? 'bomb-player' : 'bomb-box' };
            }
        }
    }

    // Prio 3 move toward nearest target via a safe route avoids blast paths.
    // playerBias skews the NPC toward hunting the human player over breaking boxes.
    const target = findNearestTarget(npc, game, { seekPowerups: config.canCollectPowerups, danger, playerBias: config.playerBias });
    if (target) {
        const step = safes.find(m => m.dir === target.firstDir);
        if (step) return { action: 'move', direction: target.firstDir, priority: 3, reason: `chase-${target.type}@(${target.row},${target.col})` };
        
        
        const adjacent = Math.abs(target.row - npc.row) + Math.abs(target.col - npc.col) === 1;
        if (adjacent) return { action: 'idle', priority: 3, reason: 'hold-adjacent' };
    }

    // Prior 4 random move  breaks loops when path is blocked or no target reachable
    if (pool.length > 0 && Math.random() < config.randomMoveChance) {
        const dir = pool[Math.floor(Math.random() * pool.length)].dir;
        const why = target ? `random(chase-blocked:${target.firstDir})` : 'random(no-target)';
        return { action: 'move', direction: dir, priority: 4, reason: why };
    }

    // Prio any valid move so the NPC doesn't get stuck
    if (pool.length > 0) {
        const dir = pool[Math.floor(Math.random() * pool.length)].dir;
        return { action: 'move', direction: dir, priority: 5, reason: 'fallback' };
    }

    return { action: 'idle', priority: 5, reason: 'no-moves' };
}

module.exports = { decideAction };
