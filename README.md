# Sigil Simulator

A rules-faithful **AI-vs-AI** simulator and balance tool for **Sigil**, a custom trading card game.
TypeScript engine + React UI, with the card data loaded from the canonical Box CSVs.

**Live:** https://ajhollowayvrm.github.io/sigil-sim/ (deploys from `main` via GitHub Actions)

## Three surfaces

1. **Watch a game** — pick two decks + a seed and step/auto-play through a single game on a visual board
   (Leader / Active / Passive zones, HP bars, live ATK/DEF, War-Torn & kill badges, event chips) with a
   per-step and full play-by-play log. Tap any card for its inscription.
2. **Batch simulation** — run N games for a matchup; see win-rates, end-reason breakdown, and game length.
3. **Cards & rules** — browse the full card pool and a coverage map of what the engine models / approximates.

Same seed + same decks ⇒ identical game (deterministic, seeded RNG).

## Develop

```bash
npm install
npm run dev      # React UI (watch / batch / cards)
npm test         # the §9 regression suite (26 tests)
npm run batch    # CLI: win-rates for the canonical matchups  (e.g. npm run batch -- 800 7)
npm run build    # production build to dist/
```

Prereqs: Node 20+.

## Layout

```
docs/                       # canonical Box exports (Ruleset, Combat & Effects, lore, Next Steps, 3 CSVs)
reference/                  # the original prototype (sigil_sim.html) + Python engine (sigil_sim.py)
src/
  engine/                   # PURE TypeScript rules — zero React/DOM imports
    rng, elements, types, stats, combat, transform, effects, game, log
  data/
    loadCards.ts            # parse the CSVs -> typed cards (stats from CSV, never transcribed)
    effects-map.ts          # printed ability text / item text -> engine primitives
    decks.ts                # the four sample decks (War / Loyalist / Goblin / Wild)
    csv-data.ts             # generated from docs/*.csv by scripts/embed-csv.ts
  sim/
    ai.ts                   # the greedy, deterministic policy (swappable)
    batch.ts                # runMatch() + stats
    recorder.ts             # per-ply snapshots for watch mode
  ui/                       # React — renders snapshots only, no rules logic
test/                       # vitest — the §9 regression cases + elements + RNG
scripts/                    # embed-csv, run-batch (CLI), pull-from-box (stub)
```

**Hard rule:** `src/engine` and `src/sim` import nothing from React/DOM, so they run headlessly under Vitest.
The UI consumes immutable per-ply snapshots from the recorder and scrubs through them.

## Source of truth

The CSVs in `docs/` are the card source of truth (the Box folder *Games / Sigil*). The engine loads cards from
them; stats are never hand-transcribed. Several rules were re-decided in design review and aren't yet in Box —
`CLAUDE.md` §5 lists these amendments (the six T2 Wild terminals + Metamorphosis), applied here and flagged
`TODO(v0.8): confirm against Box`. See `CLAUDE.md` for the full brief.
