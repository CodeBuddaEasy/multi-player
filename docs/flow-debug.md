# Reaction Arena Flow Debug

## 1) Click `Create Match`

### Intended path

1. DOM click handler: `#create-match` in `client/js/main.js`.
2. Client function: validate name, emit `CREATE_ROOM` with `{ mode: "multiplayer", name }`.
3. Server handler: `server/index.js` `socket.on(CREATE_ROOM)`.
4. Server state: create lobby (`LobbyManager.createLobby`), add host, join socket to room.
5. Server emits: `ROOM_CREATED`, `ROOM_JOINED`, then `ROOM_STATE`.
6. Client state/screen: room set in `ROOM_STATE`, lobby renders host + room code.

### Broken point found

- Empty names could still be used indirectly in some paths and validation messaging was inconsistent.

### Fix applied

- Enforced non-empty name validation client and server for create flow.
- Kept failure visible with explicit `ERROR_MESSAGE`.

## 2) Click `Join Match`

### Intended path

1. DOM click handler: `#join-match`.
2. Client function: validate name and room code format, emit `JOIN_ROOM`.
3. Server handler: `socket.on(JOIN_ROOM)`.
4. Server state: find lobby, check mode/capacity/name uniqueness, add player, join socket.
5. Server emits: `ROOM_JOINED`, `PLAYER_JOINED`, `ROOM_STATE`.
6. Client state/screen: transition to lobby and render both players.

### Broken point found

- Client had no join validation; invalid room code and empty name were emitted.
- Server accepted malformed room codes and auto-generated fallback names.

### Fix applied

- Client now requires non-empty name and strict room code format (`^[A-Z0-9]{6}$`).
- Server now rejects invalid room-code format and missing names with clear errors.

## 3) Click `Single Player`

### Intended path

1. DOM click handler: `#single-player`.
2. Client function: validate name, emit `CREATE_ROOM` with single-player mode.
3. Server handler: `socket.on(CREATE_ROOM)`.
4. Server state: create single-player lobby, add human and bots.
5. Server emits: `ROOM_CREATED`, `ROOM_JOINED`, `ROOM_STATE`.
6. Client state/screen: transition to lobby with bots visible, host can start match.

### Broken point found

- Single-player create produced lobby with only one player, so host could not start without extra manual setup.

### Fix applied

- Server now auto-adds two normal bots immediately when room mode is single-player.
- Client still supports bot reconfiguration, but base flow is now playable without extra setup.

## 4) Click `Start Match` in lobby

### Intended path

1. DOM click handler: `#start-match`.
2. Client function: emit `START_MATCH`.
3. Server handler: `socket.on(START_MATCH)`.
4. Server state: host-only authorization, `room.canStart()` check, `room.start(io)`.
5. Server emits: `MATCH_STARTED`, `ROOM_STATE`, then round events (`ROUND_COUNTDOWN`, `ROUND_SIGNAL`, `ROUND_RESULT`).
6. Client state/screen: lobby -> arena switch, timer/signal/scoreboard updates.

### Broken point found

- UI showed start controls regardless of host role/readiness; shell looked interactive even when server would reject start.

### Fix applied

- Client now gates lobby controls from real room state:
  - start visible only for host
  - start disabled unless server start preconditions are met
  - ready hidden in single-player mode

## 5) Press reaction keys during live round

### Intended path

1. DOM keydown handler in `client/js/main.js`.
2. Client function: normalize arrows/WASD, block repeats, emit `PLAYER_ACTION`.
3. Server handler: `socket.on(PLAYER_ACTION)`, normalize key, validate signal key.
4. Server state: `room.applyAction` updates per-player round result and score.
5. Server emits: `SCORE_UPDATE`, and later `ROUND_RESULT` + `ROOM_STATE`.
6. Client state/screen: seat flash/result, score/timer/signal continue updating.

### Broken point found

- Runtime chain worked, but there was no automated runtime verification proving signal -> action -> score progression end-to-end.

### Fix applied

- Added `scripts/verify-e2e-flows.js` to exercise multiplayer and single-player socket paths through live rounds.
