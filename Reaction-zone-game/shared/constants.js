module.exports = {
  GRID_WIDTH: 15,
  GRID_HEIGHT: 15,
  CELL_SIZE: 32,
  TILES: {
    FLOOR: 0,
    WALL: 1,
    BOX: 2,
    BOMB: 3,
    FIRE: 4
  },
  EVENTS: {
    CONNECT: 'connection',
    DISCONNECT: 'disconnect',
    PLAYER_JOIN: 'PLAYER_JOIN',
    PLAYER_MOVE: 'PLAYER_MOVE',
    PLACE_BOMB: 'PLACE_BOMB',
    GAME_STATE: 'GAME_STATE',
    GAME_OVER: 'GAME_OVER'
  }
};
