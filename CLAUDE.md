# Sigil Simulator — Build Brief for Claude Code

You are building a **rules-faithful simulator and balance tool** for *Sigil*, a custom trading card game.
This file is both the project brief and your standing context. Read it fully before writing code.

There is a working single-file prototype at `reference/sigil_sim.html` (a ~500-line vanilla-JS engine + UI).
**Port its engine logic — it is tested and balanced — do not start the rules from scratch.** Your job is to
move it into a proper TypeScript + React repo, load card data from the canonical CSVs instead of a
hand-transcribed subset, and add the regression tests the prototype never had.

---

## 0. Getting started — do this FIRST

### 0a. Pull the canon from Box

The card data and rules live in a Box folder: **Games / Sigil** (folder ID `392591204836`).

**If you have a Box connector/MCP available** (server `https://mcp.box.com`): list the folder and read each
file's content, then write it into `docs/`. Pull exactly these (use the highest version shown; IDs are stable):

| Save as (`docs/`)            | Box file name                | File ID         |
|------------------------------|------------------------------|-----------------|
| `Ruleset.md`                 | `Ruleset v0 7.md`            | `2300674583315` |
| `Ruleset-v0.8-Amendments.md` | `Ruleset v0 8 Amendments.md` | `2310852874969` |
| `CombatAndEffects.md`        | `Combat and Effects v0 3.md` | `2300672163644` |
| `Kaethlaan.md`               | `Kaethlaan v0 4.md`         | `2300735238125` |
| `NextSteps.md`               | `Next Steps v0 7.md`        | `2300908067066` |
| `Sigil Characters.csv`       | `Sigil Characters.csv`      | `2300735449597` |
| `Sigil Events.csv`           | `Sigil Events.csv`          | `2300756658918` |
| `Sigil Items.csv`            | `Sigil Items.csv`           | `2300755345637` |
| `reference/sigil_sim.py`     | `sigil_sim.py`              | `2302028898132` |

If the folder ID ever fails, navigate root → **Games** → **Sigil**. The CSV "read content" returns CSV text —
write it verbatim to the `docs/*.csv` paths. **Verify Box file versions against `docs/NextSteps.md` after pulling**;
if NextSteps lists a newer Ruleset/Combat doc than you pulled, prefer the newest.

**If you do NOT have a Box connector:** stop and ask AJ to either (a) connect Box to this session, or (b) export
those eight files into `docs/` (and `reference/sigil_sim.py`) manually. Do not invent card data — it must come from
the CSVs.

**Reference engine:** `reference/sigil_sim.py` is the *original* tested engine (Python). A more current JavaScript
port (`sigil_sim.html`) exists with the §5 amendments already applied — if AJ drops it into `reference/`, prefer it
for porting; otherwise port from the Python and apply §5/§6/§9 from this brief. Either way, **this brief is the
authority** where they disagree.

### 0b. Scaffold the project

```bash
npm create vite@latest sigil-sim -- --template react-ts
cd sigil-sim
npm install
npm install papaparse
npm install -D vitest @vitest/ui tsx @types/papaparse
mkdir -p docs reference src/{engine,data,sim,ui} test scripts
# add scripts to package.json:
#   "test": "vitest", "test:ui": "vitest --ui",
#   "batch": "tsx scripts/run-batch.ts", "dev": "vite"
```

Prereqs: Node 20+. CSV parsing via `papaparse`. Headless TS scripts/tests via `tsx` + `vitest`.

### 0c. Run

```bash
npm run test     # the §9 regression suite — write these early; keep them green
npm run dev      # the React watch/batch/cards UI
npm run batch    # CLI: prints win-rates for the sample matchups
```

### 0d. Order of work

Do §0 (this), then build in the §11 milestone order. **Make the §9 tests exist (red) before porting, then green.**
Commit small. Report what you pulled and your scaffold before writing engine code.

---

## 1. What this tool is

An **AI-vs-AI** simulator (no human play yet) with three surfaces:

1. **Watch a game** — pick two decks + a seed, step/auto-play through a single game on a visual board
   (Leader / Active / Passive zones, HP bars, live ATK/DEF, War-Torn & kill badges, event chips), with a
   per-step and full play-by-play log. Tapping any card opens its full inscription.
2. **Batch simulation** — run N games for a matchup, report win-rates, end-reason breakdown, and game length.
3. **Cards & rules** — browse the full card pool (tap for inscriptions) and a coverage map of what the engine models.

The engine plays both sides with a greedy heuristic (see §7). Same seed + same decks ⇒ identical game.

**Faithfulness is the point.** The value is in correctly modeling the rules so balance findings are trustworthy.

---

## 2. Source of truth & data flow

The canonical design lives in **Box** (the designer, AJ, syncs it). **Pull it into `docs/` first — see §0a for the
exact files and IDs.** The exports you'll have:

- `docs/Ruleset.md` (v0.7), `docs/CombatAndEffects.md` (v0.3), `docs/Kaethlaan.md` (lore), `docs/NextSteps.md`
- `docs/Sigil Characters.csv`, `docs/Sigil Events.csv`, `docs/Sigil Items.csv`

**The CSVs are the card source of truth.** The engine must **load cards from the CSVs** (parse at build or
runtime), not re-transcribe them. This is the #1 cause of drift in the prototype (shortened names, missing cards).

CSV schemas (match exactly):
- **Characters** (wide): `Name, Element, Tier, Terminal, HP, ATK, DEF, Affiliations, Ability Name, Ability Text,
  TransformIn, HasChain, ChainName, ChainSize, ChainAffiliation, ChainFormula, ChainExtras, Flavor, Notes`
- **Events / Items** (flat): `Name, Tier, Type, Text, Flavor, Notes` — element is encoded inside `Type`
  (e.g. `Persistent Event / Dark`).

Add `scripts/pull-from-box` as a stub (document that AJ runs the Box export manually for now). The engine should
gracefully tolerate `TBD`/`??` stat values (some cards are undesigned — keep them browsable, mark non-simulatable).

> **IMPORTANT:** The Box docs are on **v0.7**, but several rules were re-decided in a design session and are
> **not yet written to Box**. §5 lists these amendments — they **supersede** the doc text until a `v0.8` lands.
> When in doubt, implement §5, and leave a `// TODO(v0.8): confirm against Box` marker.

---

## 3. Repo layout

```
sigil-sim/
  CLAUDE.md                 # this file
  README.md
  package.json              # vite + react + typescript + vitest
  docs/                     # Box exports (canon)
  reference/sigil_sim.html  # the working prototype to port
  src/
    engine/                 # PURE TypeScript rules — ZERO react/DOM imports
      elements.ts           # wheel, beats(), darkVsLight(), hybrid handling
      types.ts              # Card, Unit, Equip, Player, GameState, effect types
      stats.ts              # effAtk/effDef/effMaxHp, auras, tier bonus
      combat.ts             # strike, dealSolo, chains, combat phase
      transform.ts          # transformation + elevation + Metamorphosis
      effects.ts            # entry/onKO/HoT/maxHP/wars/persistent events
      game.ts               # turn loop, win/loss, recorder hooks
      rng.ts                # seedable RNG (mulberry32) + shuffle
    data/
      loadCards.ts          # parse the CSVs -> typed Card objects
      effects-map.ts        # maps printed ability text -> engine effect primitives
      decks.ts              # the sample decks (§8)
    sim/
      ai.ts                 # the greedy policy (§7)
      batch.ts              # runMatch(), stats aggregation
      recorder.ts           # per-ply frame capture for watch mode
    ui/                     # React — renders snapshots only, no rules logic
      App.tsx, WatchBoard.tsx, BatchPanel.tsx, CardPool.tsx, InscriptionModal.tsx,
      EventsPanel.tsx, Card.tsx, Log.tsx
  test/                     # vitest — see §9
  scripts/                  # pull-from-box (stub), run-batch (node CLI)
```

**Hard rule: `src/engine` and `src/sim` import nothing from React/DOM** so they run headlessly under Vitest and
could be reused server-side. The UI consumes immutable per-ply snapshots from the recorder and scrubs through them.
No `localStorage`/`sessionStorage`.

---

## 4. Core rules (from Ruleset v0.7 + Combat & Effects v0.3)

- **Setup:** 30-card deck, 5-card hand, one free mulligan. Board per side: **3 active + 3 passive + 1 Leader slot**.
- **No Leader at start.** At the **end of your turn 2** you elevate one character (active or passive) that has been
  in play since turn 1. Can't? → **Leaderless lockout** (no transforms) until you elevate; **lose if no Leader by end
  of turn 6.**
- **Draw** 1/turn; if your active+passive are both empty at the start of your turn, draw 2. **Deck-out = loss.**
- **Turn:** draw → main (play cards, one transformation action, abilities) → **combat (turn 3+ only)** → end (elevation at end of turn 2).
- **Combat:** target opposing active by default (opposing Leader only if their active zone is empty). ATK ≤ DEF ⇒
  blocked (0 dmg). ATK > DEF ⇒ dmg = ATK − DEF. Elemental mod applied after. HP persists across turns. KO → discard.
- **Elements:** `Fire>Earth>Wind>Water>Fire` (+10 on attack when matchup favors). **Light +10 vs Dark.** **Dark ignores
  the first DEF check per turn vs a Light target.** Hybrid (`Dark & Light`) counts as both components.
- **Chains:** printed ability — name, size `N [Affiliation]`, optional zone restriction, damage formula
  (default = sum of participants' ATK vs target DEF once; overridable e.g. `sum +30`, AoE `×2`), costs. Initiator
  counts toward N if it shares the affiliation, else participates in addition. Element = initiator's; **+10 per
  participant** when matchup favors. KO credit → initiator. One attack per character per turn (solo OR chain).
  Multiple chains/turn. Participants active or passive (zone-restrictable). Fizzles if a participant is removed.
- **Leader slot:** Leader **may attack** from the slot; **untargetable while its controller's active zone is non-empty**
  (cards may override, e.g. Honathan); participates in chains; **tier bonus +10/+30/+50/+70** to ALL stats by *current*
  tier (dynamic). Leader transformation: **upgrade yes, no downgrade, sidegrade only at T1/T2, falls allowed.**
- **HP framework:** *Damage* (irreversible), *Heal* (persists; capped at current Max unless overheal printed),
  *Max-HP modifier* (tied to source; **cap-only rule** — raising Max doesn't raise current; lowering Max only reduces
  current if current exceeds the new Max; removal restores ceiling, current unchanged). **Entry rule:** enter at full
  base Max HP, then bonuses apply. **Sustained-by** creatures (e.g. 0/0/0) need an active Max-HP source to survive.
- **Transformation:** destination form must be **in hand**; paths printed on the destination; pay printed costs
  (consumed items, banked kills, attached events, presence). Types: upgrade / sidegrade (T1-2 direct, T3+ needs
  down-then-up) / downgrade / branch / event / presence / fall. **One transformation action per turn.**
- **Affiliations:** card text is controller-side by default; a `(G)` suffix opts into global (both sides). **Kingdom is
  a card field, not an affiliation.** Element is **Dark**, never "Shadow".
- **Persistent events** occupy a passive slot until removed. **Field cards**: world-state (both sides) vs kingdom
  (your side). Field/event stacking applies (two Plagues stack).
- **Win:** defeat the opposing Leader. **Lose:** your Leader dies / deck-out / all your characters Disgraced /
  no Leader by end of turn 6.

Read `docs/CombatAndEffects.md` for the full chain, HP, effects, entry, and sustained-by detail.

---

## 5. Session amendments — these SUPERSEDE the v0.7 docs (implement exactly)

These were locked in design review but not yet written to Box. They are the current intended rules.

1. **T1-only hard-cast.** You may only play a character *from hand* if it is **T1** (a base form) **or** it prints its
   own play permission. All T2+ forms are reached by **transformation** (or a special enabler — see Metamorphosis).
   - A form that has a printed `TransformIn` is **transform-only** (never hard-cast).
   - Standalone T2+ with a printed permission are castable when their condition is met. The one in the data:
     **King Honathan** — "control 2+ other Kaethlaan characters" (the engine lacks a kingdom field; approximate as
     "control ≥2 other characters" and leave a TODO).
   - Consequence to flag in code/comments: **A Man Bred for War** (T3, no base, no permission) is currently
     **uncastable** — needs a base form or a printed permission. Leave it uncastable + a `// TODO design` note.
2. **Play to active OR passive.** A character may be played into either zone (controller's choice). Passive = sheltered
   (no war attrition, normally untargetable) but **cannot attack**. **Elevation may pull from active or passive.**
3. **Equipment.** Applies **immediately on play** (no charge step; "charging" is opt-in and **no current card charges**).
   Must be played **onto a character** — it can never float. **Discarded when its bearer is KO'd.** Printed
   **play-conditions enforced** (e.g. *Warmonger's Resolve* — "play only while a War is in play").
4. **World-state wars hit BOTH sides.** *War / Holy War / Goblin War* deal their start-of-turn attrition to active-zone
   characters on **either side** (per the card text). Leaders are exempt (separate slot). Holy War: Light-including 0,
   pure-Dark 20, others 10. Goblin War: non-Goblin only. *Hardened Veterans* gives a controller's Royal Army immunity.
5. **Metamorphosis** (new one-shot Event, T1): transform a **T1 Wild you control into any T2 Wild in your hand**
   (any-to-any, no fixed lineage). **Does NOT use your transformation action.** Element becomes the new form's. Keeps
   banked kills. Consumed on use. (Destination must be in hand — standard rule. Future "special" cards may tutor.)
6. **Six new T2 Wild terminals** (reached only via Metamorphosis), one per element. Stats already in the prototype /
   to be added to the Characters CSV: **Embermaw** Fire 40/40/10 (entry: 10 to an opposing active),
   **Craghide** Earth 60/20/30 (Regrow), **Skirrl** Wind 40/30/10 (chain *Gust* — Chain 2 Wild, active-only),
   **Tidewretch** Water 50/30/20, **Hollowed Stag** Light 40/20/30 (entry: heal 10), **Gravecreep** Dark 40/40/0.
7. **Design directions** (not rules, but guide content): events lean **Persistent**; a **Wild deck** is a real
   archetype; transform-in forms are transform-only.

Open tuning note (context, not a rule): games currently resolve ~turn 4–5 because every turn-1 body — hence every
Leader candidate — is a fragile T1 (+10 bonus). **Leader durability** is the lever AJ wants to explore. Don't "fix"
balance unilaterally; surface it.

---

## 6. Card effects — modeling guide

Build a small **effect primitive set** and a `data/effects-map.ts` that maps printed `Ability Text` / `Type` to
primitives, rather than a giant switch. Primitives to support (all present in the prototype):

- **aura** — conditional stat buff (by affiliation / element / zone / presence). E.g. Honathan (+10/+10 Royal Army &
  King's Court while in play), Mage Arlia (+10 ATK Mages Guild), Goblin Captain (+10 ATK Goblins), Crusade, Horde
  Frenzy, Rally to War, A Crisis of Faith (+10 ATK/−10 DEF), Shield Wall, Staff of Aelion/Tidecaller's Pearl
  (element-conditional equips), Blood Money (+10 ATK per banked kill).
- **entry** — on enter-play trigger: damage (Mage Arlia, Embermaw), heal (Lumenkit, Hollowed Stag, Field Rations),
  draw (Reagent Pouch, A Crisis of Faith). Fires on hard-cast, transform, and Metamorphosis.
- **onKO** — King's Blade (draw on KO while Honathan in play), Horde Frenzy (draw when your Goblin is KO'd).
- **hot** — heal-over-time at start of your turn: Regrow (Murlifect, Craghide), The Long Road.
- **maxhp** — Max-HP modifier with the cap-only rule: Plague (−10 both sides), Medical Advancement (+10 your side),
  Vital Charm (+20), Feliefnir (+30). *(Prototype only partly models cap-only — implement it properly here.)*
- **chain** — name, size, affiliation, formula (`sum`, `sum+N`, `sum vs DEF`, AoE `×2` + Disgrace-on-KO), zone,
  element amp; Keeper of the Channel reduces Divine Channel chain size by 1.
- **war / persistent event** — see §5.4; plus the wartime buffs and the capture mechanics.
- **flags** — `no_aura`, `war_child`/`forged_in_chains` (attack-through-War-Torn), `cannot_become_wartorn`
  (At Peace, immunity equips), `hit_passive`, `hit_leader`, `must_attack` (The Silent), `high_atk_bonus`
  (The Silent +20 vs ATK≥50), `leader_protect_royal` (Honathan).
- **The Broken March** — overrides War-Torn's no-attack and grants a War-Torn chain (sum of ATK to one target) at 2+.
- **Metamorphosis** — §5.5.

**Approximate or stub (and mark in the coverage map), do not fake:** redirect (Me for You, At Her Side),
negate-and-destroy / immunities (Magical Shield, Protection of the Divine, Feliefnir) — no destroy/manipulation
cards exist to trigger them yet; The Ascended variable stats (HP/ATK/DEF = items consumed ×20); deck-search
(Call of the Channel, Seeker); mulligan & hand-size (open rules questions — implement the single free mulligan,
leave hand-size configurable with a TODO). Love-road marriage cards have `TBD` stats — browsable, not simulatable.

---

## 7. The AI heuristic (greedy, deterministic)

Per ply, in order: (1) **Metamorphosis** if a T1 Wild is in play and a T2 Wild is in hand; (2) **hard-cast** playable
T1 bases / permitted standalones — to passive if a war would chip a non-attacker or during the opening, else active;
(3) **equip** immediately to the highest-eff-ATK board character (respect play-conditions; need a bearer);
(4) play **events/auras/wars** whose conditions are met; (5) **transform** — prioritize Leader upgrades, then board
characters (pay costs; route a War-Torn non-attacker to passive, an attacker to active); (6) **combat** — resolve
chains first, then solo attacks choosing KO if possible else the highest-value reachable target; the **Leader attacks
too**; (7) at end of turn 2, **elevate** the strongest eligible character (by tier, then ATK+HP).

Keep the AI in `sim/ai.ts`, separate from the engine, so policies can be swapped later.

---

## 8. Sample decks (port from the prototype)

`War` (Kael outlaw/loyal + Illyego + wars), `Loyalist` (Arlia line + Honathan + Divine Channel), `Goblin`
(Goblin climb + Goblin War), `Wild` (T1 Wilds + the six T2 Wilds + 4× Metamorphosis). The exact lists are in
`reference/sigil_sim.html` (`deckWar/deckLoyalist/deckGoblin/deckWild`). Each deck is 30 cards (pad/truncate).

---

## 9. Regression tests to write first (these are the bugs the prototype shipped)

Encode these as Vitest cases — they are the whole reason for moving to a repo:

1. **Leader tier bonus** — a T2 character crowned Leader has `effAtk = base + 30` (a `Unit` must expose `tier`;
   the prototype returned `NaN` because it didn't). Test +10/+30/+50/+70 for T1–T4.
2. **Lone Leader can attack** — with both active zones empty, a Leader can attack the opposing Leader and a game
   does not stall to the turn cap. (The prototype's combat only iterated the active zone → infinite "end turn" loop.)
3. **World-state wars hit both sides** — one player's War damages the *opponent's* active characters too.
4. **Equipment never floats** — when a bearer is KO'd, its linked equipment is removed from play (not orphaned in a slot).
5. **No combat before turn 3.**
6. **T1-only hard-cast** — attempting to hard-cast a T2+ form with a `TransformIn` is rejected; reaching it via
   transformation succeeds.
7. **Transform destination must be in hand**; transformation respects the one-per-turn cap; **Metamorphosis does NOT
   consume the transformation action** (you can morph *and* transform the same turn).
8. **Elemental math** — Fire vs Earth +10; Light vs Dark +10; Dark ignores first DEF vs Light once per turn.
9. **Determinism** — same seed + decks ⇒ identical recorded game (frame-for-frame).
10. **Batch sanity** — over N games, win-rates sum to ~100%, no crashes, and `War`/`Loyalist`/`Goblin`/`Wild` all play.

A good smoke test: a batch of the four decks should run without throwing and produce plausible (non-0/100) splits.

---

## 10. Coverage map (surface it in the UI, like the prototype's "Cards & rules" tab)

Keep an explicit, in-app list of **modeled / approximated / not-modeled** effects so balance results are read with
the right caveats. Update it as you implement. This honesty is a feature, not an afterthought.

---

## 11. Milestones

1. Repo scaffold (vite + ts + react + vitest), CSV loader, types, RNG. Tests for elements + RNG determinism.
2. Port the engine (stats, combat, chains, transform, effects, game loop) to TS. Make tests §9.1–§9.9 pass.
3. Batch runner + CLI (`scripts/run-batch`) reproducing the prototype's win-rate output.
4. React UI: WatchBoard with scrubbable frames, BatchPanel, CardPool + InscriptionModal, EventsPanel, coverage map.
5. Wire data fully from CSVs; implement the §5 amendments and as many §6 effects as are deterministic; mark the rest.

Definition of done for v1: all §9 tests green; the four decks watchable and runnable in batch; every CSV card browsable
with its inscription; coverage map accurate.

---

## 12. Working agreements

- Engine stays pure and tested; UI renders snapshots only.
- Card **data** comes from the CSVs — never hand-transcribe stats into code.
- When a rule is ambiguous, follow §5, then the v0.7 docs, and leave a `TODO(v0.8)` rather than inventing.
- Don't auto-"balance" the game; expose findings (win-rates, end-reasons, game length) and let the designer decide.
- Prefer small, tested commits. The first commit should make the §9 tests runnable (red), the next make them green.

---

## 13. Begin

Start now: do **§0** (pull the Box canon, scaffold), then **§11 milestone 1**. Before writing engine code, report:
(1) which Box files you pulled and their versions, (2) any file you couldn't get, (3) your scaffold + the failing §9
test list. Then proceed milestone by milestone, keeping the engine pure and the tests green.
