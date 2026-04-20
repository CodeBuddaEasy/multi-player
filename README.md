# Reaction Arena

Reaction Arena is a DOM-only, real-time multiplayer browser game built with Node.js, Express, Socket.IO, vanilla JavaScript, HTML, and CSS.

Players sit around a central signal board and compete in repeated reaction rounds:
- fastest correct input scores highest
- wrong answers and false starts are penalized
- scores/timer/winner are synchronized for all players

## Features

- 2-4 player multiplayer over URL + room code
- Host-controlled lobby and match start
- Unique player names, ready states, and cosmetic avatar settings
- Pause/Resume/Quit announcements with actor attribution
- Real-time score updates and visible match timer
- Sudden-death tie-break behavior
- Optional single-player mode (1 human vs 1-3 bots)
- DOM-only rendering with `requestAnimationFrame`
- Web Audio based SFX with settings toggles

## Controls

- `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- `W`, `A`, `S`, `D` map to the same actions
- `Esc` toggles pause/resume

## Setup and Local Run (Windows)

1. Install Node.js 18+.
2. Install dependencies:
   - `npm install`
3. Start the server:
   - `npm start`
4. Open:
   - `http://localhost:3000`

Open the same URL on separate computers/browsers to join the same room.

## Reviewer Access Link

Use this section for a single public URL reviewers can open without local setup.

- Public reviewer URL: `https://<your-deployment-url>`
- Health check: `https://<your-deployment-url>/`

Recommended: deploy once (Render/Railway/Fly.io) and replace both placeholders above with the final URL before submission.

### Temporary fallback (when no deployment URL exists yet)

If you need a quick shareable URL from your Windows machine:

1. Start the app:
   - `npm start`
2. In a second PowerShell terminal, run:
   - `npx localtunnel --port 3000`
3. Share the generated `https://*.loca.lt` URL with reviewers.

Note: localtunnel URLs are temporary and change between sessions.

## Multiplayer Usage

1. Host clicks **Create Match**.
2. Share room code shown in lobby.
3. Players join with **Join Match** and set unique names.
4. Host starts when enough players are ready.
5. Play rounds until timer ends, then view final ranking.

## Single-Player Bonus

1. Click **Single Player**.
2. Choose bot count (1-3) and difficulty (easy/normal/hard).
3. Configure bots from lobby and start match.

Bots simulate imperfect human timing and can miss/wrong-input/false-start.

## Verification Scripts

- `npm run verify`
  - `scripts/verify-round-logic.js`
  - `scripts/verify-bots.js`

## Debug Mode

Set:
- `DEBUG_REACTION_ARENA=true`

Then run `npm start` for extra server logs.

## Deployment Notes

- Server binds `process.env.PORT || 3000`.
- Works on typical Node hosting platforms.
- Ensure WebSocket support is enabled for Socket.IO.

## Known Limitations

- Legacy Bomberman files still exist in the repository but are not loaded by the active runtime chain (`npm start` -> `server/index.js` -> `client/index.html` -> `client/js/main.js`).
- Current client is optimized for desktop keyboard play (mobile touch is not implemented).
- Browser-level multiplayer interaction was verified manually/statistically, not with full end-to-end browser automation.
