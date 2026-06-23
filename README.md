# Sigil Simulator

A rules-faithful AI-vs-AI simulator and balance tool for **Sigil**, a custom trading card game.

> **Status:** repo bootstrap. The build brief and a working single-file prototype are in place;
> the TypeScript + React port has not started yet.

## What's here

- **`CLAUDE.md`** — the full build brief and standing context (read it first). Covers the rules,
  the v0.7 → session amendments (§5), the effect-modeling guide (§6), the AI heuristic (§7), the
  regression suite to write first (§9), and the milestone plan (§11).
- **`reference/sigil_sim.html`** — the working ~1000-line vanilla-JS prototype engine + UI to port.
  Open it directly in a browser to watch games, run batches, and browse the card pool.

## Next steps

Follow `CLAUDE.md` §0 and §11: pull the canon from Box into `docs/`, scaffold the Vite + React + TS
project, then port the engine and write the §9 regression tests. The engine (`src/engine`, `src/sim`)
stays pure TypeScript with zero React/DOM imports; the UI renders immutable per-ply snapshots.

## Try the prototype now

Open `reference/sigil_sim.html` in any modern browser — no build step required.
