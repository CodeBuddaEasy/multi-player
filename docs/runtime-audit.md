# Runtime Audit - Reaction Arena

## 1) Runtime entry map

- `npm start` -> `node server/index.js` (from `package.json`)
- Server boot file -> `server/index.js`
- Express static root -> `client/` (`app.use(express.static(path.join(__dirname, "..", "client")))`)
- Browser entry -> `client/index.html`
- HTML assets loaded:
  - CSS: `client/css/style.css`
  - JS: `/socket.io/socket.io.js`, `client/js/debugOverlay.js`, `client/js/main.js`

### Active socket events in runtime path

- Client -> Server:
  - `CREATE_ROOM`, `JOIN_ROOM`, `UPDATE_COSMETICS`, `READY_TOGGLE`, `START_MATCH`
  - `LEAVE_ROOM`, `START_SINGLE_PLAYER`, `PLAYER_ACTION`
  - `PAUSE_GAME`, `RESUME_GAME`, `QUIT_GAME`, `REQUEST_REMATCH`
  - `ROOM_STATE_PING`
- Server -> Client:
  - `ROOM_CREATED`, `ROOM_JOINED`, `ROOM_STATE`, `PLAYER_JOINED`, `PLAYER_LEFT`
  - `MATCH_STARTED`, `ROUND_COUNTDOWN`, `ROUND_SIGNAL`, `ROUND_RESULT`
  - `SCORE_UPDATE`, `GAME_PAUSED`, `GAME_RESUMED`, `GAME_QUIT`
  - `MATCH_FINISHED`, `SYSTEM_MESSAGE`, `ERROR_MESSAGE`
  - `ROOM_STATE_PONG`

## 2) Files definitely used by active runtime

- Server runtime:
  - `server/index.js`
  - `server/lobbymanager.js`
  - `server/game.js`
  - `server/validation.js`
  - `server/botAI.js`
  - `shared/constants.js`
- Client runtime:
  - `client/index.html`
  - `client/css/style.css`
  - `client/js/main.js`
  - `client/js/debugOverlay.js`
- Verification/runtime scripts:
  - `scripts/verify-round-logic.js`
  - `scripts/verify-bots.js`

## 3) Legacy / dead files (currently unused by active runtime)

These files are present in repo but not imported/loaded by current runtime chain:

- Legacy server gameplay:
  - `server/bomb.js`
  - `server/gameActions.js`
  - `server/grid.js`
  - `server/gameState.js`
  - `server/npc/difficulties.js`
  - `server/npc/npcAI.js`
  - `server/npc/npcManager.js`
  - `server/npc/pathfinding.js`
- Legacy client scripts/CSS:
  - `client/js/input.js`
  - `client/js/lobby.js`
  - `client/js/menu.js`
  - `client/js/npcConfig.js`
  - `client/js/pause.js`
  - `client/js/renderer.js`
  - `client/js/sound.js`
  - `client/js/ui.js`
  - `client/css/npc.css`
- Legacy duplicate constants path:
  - `bomber-grid-game/shared/constants.js`

## 4) Requirement checklist (PASS / FAIL / PARTIAL)

| Requirement | Status | Evidence |
|---|---|---|
| 2 to 4 multiplayer | PASS | `GAME.MAX_PLAYERS=4`, join guard and start guard in `server/index.js` + `server/game.js` |
| Unique player names | PASS | Duplicate checks in `JOIN_ROOM` and `SET_NAME` handlers |
| Host-only start | PASS | `START_MATCH` rejects non-host |
| DOM-only rendering | PASS | No canvas in active `client/index.html`/`client/js/main.js` |
| requestAnimationFrame usage | PASS | Single RAF loop in `client/js/main.js` |
| Real-time simultaneous play | PASS | Server-authoritative simultaneous input via `PLAYER_ACTION` + round phases |
| All players visible | PASS | Seats top/right/bottom/left rendered from room state in `client/js/main.js` |
| Pause/Resume/Quit with actor name broadcast | PASS | `game.pause()/resume()` + `QUIT_GAME` emit `SYSTEM_MESSAGE` with actor name |
| Real-time score display | PASS | `ROOM_STATE` + `SCORE_UPDATE` update rendered cards/seats |
| Visible timer | PASS | `timeRemainingMs` rendered in HUD timer |
| Winner at end | PASS | `MATCH_FINISHED` ranking + end screen rendering |
| Keyboard responsiveness | PASS | key set + anti-repeat (`e.repeat` and pressed set) |
| Sound effects | PASS | Web Audio tone events in `client/js/main.js` |
| Localhost runability | PASS | Verified HTTP 200 and served page contains Reaction Arena |
| Internet deployment readiness | PARTIAL | `PORT` support and Socket.IO ready; deployment docs are generic, no provider-specific example |
| README completeness | PARTIAL | Good baseline, but legacy/runtime mapping and limitations needed more explicit wording |
| Optional single-player mode | PASS | `CREATE_ROOM(singleplayer)` + `START_SINGLE_PLAYER` with 1-3 bots |

## 5) Risk list

1. Legacy Bomberman files still in root folders can mislead reviewers about active path.
2. Mixed hardcoded event strings and constants still exist in some active files (reduced but not fully eliminated).
3. No browser automation/integration tests; multiplayer correctness is validated via logic scripts plus static runtime tracing.
4. Deployment guidance is broad and should be explicit about reverse-proxy/WebSocket settings for production hosts.
