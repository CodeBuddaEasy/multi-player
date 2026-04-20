# Reaction Arena Implementation Plan

## Scope
- Replace Bomberman gameplay with Reaction Arena.
- Keep Node.js + Express + Socket.IO + vanilla DOM architecture.
- Preserve multiplayer flow and add optional single-player bots.

## Execution Phases
1. Protocol + validation baseline.
2. Authoritative lobby and room control.
3. Round engine, scoring, timer, and sudden death.
4. DOM-first UI rebuild for menu/lobby/arena/end states.
5. Input robustness, audio feedback, and rendering loop polish.
6. Bonus bot mode tuning.
7. Verification scripts and README/deployment updates.

## Reuse Strategy
- Reuse server static hosting and Socket.IO runtime.
- Reuse room manager concept.
- Replace Bomberman-specific game state and renderer logic.

## Deliverables
- Working Reaction Arena multiplayer game.
- Optional single-player bots.
- Verification scripts for round logic and bot timing sanity.
- Updated README and deployment notes.
