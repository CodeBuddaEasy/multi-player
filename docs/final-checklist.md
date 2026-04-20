# Final Checklist (Current Pass)

## Exact flows tested

1. `npm run verify` for deterministic game logic + bot behavior scripts.
2. `npm run verify:e2e` against a live server instance:
   - multiplayer create room
   - multiplayer join room
   - ready + start match
   - wait for live signal
   - submit player actions
   - verify round resolves with winner
   - single-player create with bots
   - single-player start + signal + round resolve

## What passed

- Create Match requires valid name and creates playable lobby.
- Join Match requires valid name + 6-char room code.
- Room-not-found, invalid code, room full, duplicate name errors are surfaced from server.
- Lobby host/start control visibility and start enablement now follow room state.
- Multiplayer and single-player both reach live signal phase and resolve rounds in runtime socket tests.
- Single-player now auto-provisions bots on room creation.

## What failed

- No browser-level automation for visual-only checks (manual verification still required for exact UI appearance and transitions).

## Remaining limitations

1. Pause/resume/quit/rematch flows were statically wired and preserved but not fully covered by automated socket script in this pass.
2. Friendly error rendering outside menu is feed-based and minimal (not a dedicated banner component).
3. Full two-real-browser manual QA still required to certify complete production behavior.

## Exact files changed in this pass

- `client/js/main.js`
- `server/index.js`
- `scripts/verify-e2e-flows.js`
- `package.json`
- `package-lock.json`
- `docs/flow-debug.md`
- `docs/final-checklist.md`
