

const { spawnPoints } = require('../grid');
const { decideAction } = require('./npcAI');
const { movePlayer, placeBomb } = require('../gameActions');

// Maps a speed stat (1–10) to a tick interval in ms (1=1000ms slow, 10=350ms fast)
function speedToTickRate(speed) {
    return Math.round(1000 - (speed - 1) * (650 / 9));
}

// Derives a label string used by the lobby badge — reflects overall bot power
function deriveLabel(speed, aggression, accuracy) {
    const avg = (speed + aggression + accuracy) / 3;
    if (avg < 4) return 'easy';
    if (avg < 7) return 'med';
    return 'hard';
}

const NPC_NAMES = ['Bober Bot', 'Bomba', 'Explodo', 'Krazybob', 'Kaboom', 'Boomski'];

// Inserts NPC player objects into game.players and marks them ready
function addNPCs(game, npcConfigs) {
    const usedNames = Object.values(game.players).map(p => p.name);
    const namePool  = NPC_NAMES.filter(n => !usedNames.includes(n));

    npcConfigs.forEach((config, i) => {
        const usedNumbers = Object.values(game.players).map(p => p.number);
        let num = 0;
        while (usedNumbers.includes(num)) num++;
        if (num >= 4) return;

        const spd = config.speed      || 5;
        const agg = config.aggression || 5;
        const aim = config.accuracy   || 5;
        const spawn = spawnPoints[num];
        game.players[`npc-${num}`] = {
            id:           `npc-${num}`,
            isNPC:        true,
            
            difficulty:   deriveLabel(spd, agg, aim),
            speed:        spd,
            aggression:   agg,
            accuracy:     aim,
            number:       num,
            name:         namePool[i] || `Bot ${num + 1}`,
            skinIndex:    num + 1,
            row:  spawn.row, col: spawn.col,
            x:    spawn.col, y:   spawn.row,
            alive:        true,
            activeBombs:  0,
            maxBombs:     1,
            bombRange:    1,
            wins:         game.playerWins[num] || 0,
            boxesDestroyed: 0,
            hasBomb:      false,
            
        };
        game.readyPlayers.add(num);
    });
}

// Starts an independent setInterval tick for every NPC in the game
function startNPCLoops(game, io) {
    if (!game.npcIntervals) game.npcIntervals = {};
    Object.values(game.players)
        .filter(p => p.isNPC)
        .forEach(npc => {
            game.npcIntervals[npc.id] = setInterval(
                () => tickNPC(npc, game, io),
                speedToTickRate(npc.speed || 5)
            );
        });
}

// Clears all running NPC intervals
function stopNPCLoops(game) {
    if (!game.npcIntervals) return;
    Object.values(game.npcIntervals).forEach(id => clearInterval(id));
    game.npcIntervals = {};
}

// Set to true to print one log line per NPC tick
const DEBUG_NPC = false;

// One tick ask AI for a decision then execute it
function tickNPC(npc, game, io) {
    if (game.gameState !== 'playing' || game.gamePaused || !npc.alive) return;
    const decision = decideAction(npc, game);

    let result = 'idle';
    if (decision.action === 'move') {
        const moved = movePlayer(game, npc.id, decision.direction, io);
        result = moved ? `moved ${decision.direction}` : `BLOCKED ${decision.direction}`;
    } else if (decision.action === 'bomb') {
        const placed = placeBomb(game, npc.id, io);
        result = placed ? 'BOMB placed' : 'BOMB failed';
    }

    if (DEBUG_NPC) {
        console.log(
            `[NPC ${npc.id} ${npc.difficulty}] pos=(${npc.row},${npc.col})` +
            ` p${decision.priority} ${decision.reason}` +
            ` → ${result}`
        );
    }
}

module.exports = { addNPCs, startNPCLoops, stopNPCLoops };
