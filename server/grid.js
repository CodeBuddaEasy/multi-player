

const { TILES, GRID_WIDTH, GRID_HEIGHT } = require('../shared/constants');

// Spawn points for up to 4 players (one in each corner)
const spawnPoints = [
    { row: 1, col: 1 },                          // Top-left
    { row: GRID_HEIGHT - 2, col: GRID_WIDTH - 2 },  // Bottom-right
    { row: 1, col: GRID_WIDTH - 2 },              // Top-right
    { row: GRID_HEIGHT - 2, col: 1 }              // Bottom-left
];

// Create a new randomized grid with safe spawn corners
function createGrid() {
    const grid = [];

    for (let row = 0; row < GRID_HEIGHT; row++) {
        grid[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            // Border walls (edges of the map)
            if (row === 0 || row === GRID_HEIGHT - 1 || col === 0 || col === GRID_WIDTH - 1) {
                grid[row][col] = TILES.WALL;
            }
            // Interior walls at even row+col (classic Bomberman grid pattern)
            else if (row % 2 === 0 && col % 2 === 0) {
                grid[row][col] = TILES.WALL;
            }
            // Random: 50% box, 50% open floor
            else {
                grid[row][col] = Math.random() < 0.5 ? TILES.BOX : TILES.FLOOR;
            }
        }
    }

    // Clear spawn corners so players have room to escape bombs
    // Top-left
    grid[1][1] = TILES.FLOOR;
    grid[1][2] = TILES.FLOOR;
    grid[1][3] = TILES.FLOOR;
    grid[2][1] = TILES.FLOOR;
    grid[3][1] = TILES.FLOOR;

    // Top-right
    grid[1][GRID_WIDTH - 2] = TILES.FLOOR;
    grid[1][GRID_WIDTH - 3] = TILES.FLOOR;
    grid[1][GRID_WIDTH - 4] = TILES.FLOOR;
    grid[2][GRID_WIDTH - 2] = TILES.FLOOR;
    grid[3][GRID_WIDTH - 2] = TILES.FLOOR;

    // Bottom-left
    grid[GRID_HEIGHT - 2][1] = TILES.FLOOR;
    grid[GRID_HEIGHT - 2][2] = TILES.FLOOR;
    grid[GRID_HEIGHT - 2][3] = TILES.FLOOR;
    grid[GRID_HEIGHT - 3][1] = TILES.FLOOR;
    grid[GRID_HEIGHT - 4][1] = TILES.FLOOR;

    // Bottom-right
    grid[GRID_HEIGHT - 2][GRID_WIDTH - 2] = TILES.FLOOR;
    grid[GRID_HEIGHT - 2][GRID_WIDTH - 3] = TILES.FLOOR;
    grid[GRID_HEIGHT - 2][GRID_WIDTH - 4] = TILES.FLOOR;
    grid[GRID_HEIGHT - 3][GRID_WIDTH - 2] = TILES.FLOOR;
    grid[GRID_HEIGHT - 4][GRID_WIDTH - 2] = TILES.FLOOR;

    return grid;
}

// Replace all fire tiles with floor (called after explosion animation)
function clearFire(grid) {
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (grid[row][col] === TILES.FIRE) {
                grid[row][col] = TILES.FLOOR;
            }
        }
    }
}

module.exports = { createGrid, clearFire, spawnPoints };
