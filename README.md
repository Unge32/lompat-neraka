# Lompat Neraka

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Unge32/lompat-neraka/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Unge32/lompat-neraka/reward.svg)](https://make.fun/bounty/best-game-01)

Entry for [make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01) ($1000 in USDC).

## The game

**Lompat Neraka** (Hell Jump) is an original 2D side-scrolling platformer in Indonesian. Bimo, the little ember kid, must cross the Thorn Island — 6 levels of brutally hard but always fair challenges: spike fields, bottomless pits, moving and disappearing platforms, patrolling spiked guardians, hidden blocks, and timing gates. Every death teaches something; every hard section ends in a checkpoint. Hard, rage-inducing, beatable with brains.

- 6 levels with a real difficulty curve: level 1 teaches, later levels combine every mechanic
- Tight controls: fixed 1/60 s timestep, variable jump height, coyote time, jump buffering
- Spikes, lava, moving platforms, disappearing platforms, 3 enemy kinds (walker, roller, flyer), hidden blocks, coins, checkpoints, goal flags
- Death counter + timer on the HUD, all UI text in Indonesian
- Keyboard (arrows / WASD + jump) and on-screen touch buttons for phones
- Synthesized WebAudio sound effects — no audio files, no network, fully offline

## Controls

| Key | Action |
| --- | --- |
| ← → or A D | Run |
| Space / W / ↑ | Jump (hold = higher) |
| P or Esc | Pause |
| M | Sound on/off |
| Enter | Start / next level |
| R | Restart (on death / win screens) |

On touch screens: ◀ ▶ buttons to move, LOMPAT to jump.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies: `game/` is plain static files.
