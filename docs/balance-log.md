# Sigil deck-parity balance log

Goal: bring the four sample decks (War, Loyalist, Goblin, Wild) to ~parity —
every deck near 50% overall win-rate in a full round-robin, small max-min spread.

Method: tune cards/decks → re-measure with `npm run parity` (round-robin, all 6
pairings, multiple seeds) → keep changes that shrink the spread, revert ones that
don't. Deck size held at 40 (size is a global lever and doesn't fix *relative*
gaps; parity is a per-deck composition/power problem).

Parity target: spread ≤ ~8 pts, every deck overall in [44, 56], no single matchup
worse than ~38/62.

Metric per round = SPREAD (max-min of per-deck overall WR) and WORST matchup.

---

## Baseline (before any parity work)

`npm run parity 500 4` — 2000 games/pairing, ±~1.1 pts noise.

```
row vs col      War Loyalist   Goblin     Wild   overall
War              —     31.1%    18.4%    15.9%   21.8%
Loyalist      68.9%       —     43.3%    48.1%   53.4%
Goblin        81.6%    56.8%       —     59.0%   65.8%
Wild          84.1%    51.9%    41.0%       —    59.0%
```

**SPREAD: 44.0 pts · WORST: War vs Wild 15.9%**

Diagnosis:
- **War (21.8%) is broken**, not just weak. Two structural bugs:
  1. `A Man Bred for War` ×2 are **uncastable** (T3, no base form, no play permission) — 2 dead cards in 40.
  2. The deck climbs the Kael *loyal* road to **The King's Blade**, whose buff is
     all conditional on **King Honathan** — who isn't in the War deck. Dead payoff.
  - Meanwhile its world Wars (War/Holy War) chip its *own* fragile bodies (both-sides attrition).
- **Goblin (65.8%) is overpowered.** `Goblin War` is pure asymmetric upside (only
  hurts non-Goblins, both sides) + `Horde Frenzy` draw engine + cheap aura bodies.
- **Wild (59.0%)** a bit hot; **Loyalist (53.4%)** roughly central.

Plan: fix War first (biggest lever — make it functional + commit to its strong
self-sufficient line), then trim Goblin/Wild, then fine-tune.

Lever isolation (which decks a change touches):
- War-signature cards (all `Kael *`, `Illyego *`, `A Man Bred for War`) → **War only**.
- Goblin-specific (`Goblin Soldier/Lieutenant/Captain`, `Lor'oak *`, `Goblin War`,
  `Horde Frenzy`) → **Goblin only**.
- Wild creatures (`Bogfang`, `Murlifect`, `Stoneback`, …) → Wild core **and** Goblin
  filler — shared, so prefer Goblin-specific cards when nerfing Goblin.
- Loyalist (Kaethlaan/Arlia/Channel) → Loyalist only.

---

## Round 1 — make War functional

Changes:
- `A Man Bred for War`: granted a play permission (`CHAR_PLAY: 0`) so it's castable as
  a T3 body — was a dead card (uncastable) ×2 in the War deck.
- War deck rebuilt: dropped the loyal road (`Kael the Shadow` / `The King's Blade`,
  whose payoff is dead without Honathan) and the off-archetype wild filler; committed
  to the **Outlaw Kael road** (`Captured → Runaway → Killer → The Silent`) + the
  Illyego war engine + `A Man Bred for War`. Added a 2nd `Rally to War` and `War Effort`.

Result (`npm run parity 500 4`): War 21.8 → **30.5**. **SPREAD 44.0 → 32.2.**
Still worst (War vs Wild 25.3). War reaches its T3/T4 payoffs too slowly vs aggro.

## Round 2 — buff War's early bodies (durability)

War loses before its climb pays off, and its fragile T1/T2 bodies die to fast aggro
(and to its own world Wars). Bumped HP/DEF (kept ATK identity) on the War-exclusive line:

| Card | HP/ATK/DEF before → after |
|---|---|
| Kael, Destined Trainee | 20/20/0 → 30/20/10 |
| Swiftblade Kael | 40/50/10 → 50/50/20 |
| Kael the Captured | 40/30/10 → 50/40/20 |
| Kael the Runaway | 40/50/0 → 50/50/10 |
| Kael the Killer | 50/70/0 → 60/70/10 |
| Illyego, the Orphan | 20/20/0 → 30/20/10 |
| Illyego, the Soldier | 40/40/10 → 50/40/20 |
| Illyego, the Conqueror | 60/60/20 → 70/60/30 |
| A Man Bred for War | 60/40/30 → 60/50/40 |

(Tooling: added `npm run parity` with a `preparity` embed step — CSV stat edits only
take effect after re-embedding `csv-data.ts`.)

Result: 

```
row vs col      War Loyalist   Goblin     Wild   overall
War              —     49.3%    42.0%    41.8%   44.3%
Loyalist      50.7%       —     43.3%    48.1%   47.4%
Goblin        58.0%    56.8%       —     59.0%   58.0%
Wild          58.3%    51.9%    41.0%       —    50.4%
```
**SPREAD 32.2 → 13.6.** War now competitive (44.3). Goblin (58.0) is the outlier.

## Round 3 — nerf Goblin (the overperformer)

Goblin beats all three others 57–59%. Trim durability on its mid/top bodies
(Goblin-exclusive cards, isolated lever); keep ATK = its aggro identity.

| Card | before → after |
|---|---|
| Goblin Lieutenant | 40/30/20 → 40/30/10 |
| Goblin Captain | 60/40/30 → 50/40/20 |
| Lor'oak Goblin Commander | 50/30/20 → 40/30/10 |

Result: **SPREAD 13.6 → 8.5.** War 45.3 / Loyalist 48.4 / Goblin 53.8 / Wild 52.5.
All four in [44, 56]. Goblin still the ceiling.

## Round 4 — compress the ends

- Goblin deck: `Horde Frenzy` ×2 → ×1 (one copy → `Stoneback`).
- `Illyego, the Soldier` ATK 40 → 50 (War's attack-through-War-Torn backbone; lifts War's worst matchup).

Result: **SPREAD 8.5 → 7.5.** War 46.1 / Loyalist 48.4 / Wild 51.9 / Goblin 53.6.

## Round 5 — Goblin War copy (REVERTED — backfired)

Tried Goblin deck `Goblin War` ×2 → ×1, expecting a nerf. It **buffed** Goblin
(53.6 → 55.0, spread up to 9.4): the Goblin deck's filler (Bogfang/Murlifect/
Stoneback/…) are **non-Goblin Wilds**, so `Goblin War` was damaging Goblin's own
filler. Removing a copy cut that self-harm. Reverted.

**Lesson:** `Goblin War` is partly self-limiting through the deck's non-Goblin filler;
the clean Goblin lever is body stats, not the war count.

## Round 6 — nerf Goblin core + Wild payoffs (the parity round)

- `Goblin Soldier` HP 30 → 20 (its ×5 core body; Goblin is very sensitive to this —
  drove Goblin 53.6 → 46.6 on its own).
- With Wild now the ceiling (55.2, beating everyone), trimmed the Wild-exclusive T2
  terminals (nerfing these lifts the *other three*, who all lose to Wild, and drops Wild):
  - Embermaw 40/40/10 → 40/30/10
  - Tidewretch 50/30/20 → 40/30/20
  - Gravecreep 40/40/0 → 40/30/0

**Result — PARITY (validated at 6000 games/pairing, ±0.6 noise):**

```
row vs col      War Loyalist   Goblin     Wild   overall
War              —     49.5%    51.6%    48.1%   49.7%
Loyalist      50.5%       —     52.3%    54.0%   52.2%
Goblin        48.4%    47.7%       —     49.2%   48.4%
Wild          51.9%    46.0%    50.8%       —    49.6%
```

**SPREAD 44.0 → 3.8.** Every deck in [48.4, 52.2]; worst matchup Loyalist vs Wild
54.0 (4.0 off 50). Stopped here — tighter would over-fit to the greedy AI rather
than reflect real balance.

---

## Summary of all canon card changes (for review)

Rules:
- `A Man Bred for War` — granted a standalone play permission (was uncastable). See
  the printed-text update in `Sigil Characters.csv`.

Stat changes (`Sigil Characters.csv`), HP/ATK/DEF:
| Card | before → after | reason |
|---|---|---|
| Kael, Destined Trainee | 20/20/0 → 30/20/10 | War durability |
| Swiftblade Kael | 40/50/10 → 50/50/20 | War durability |
| Kael the Captured | 40/30/10 → 50/40/20 | War durability |
| Kael the Runaway | 40/50/0 → 50/50/10 | War durability |
| Kael the Killer | 50/70/0 → 60/70/10 | War durability |
| Illyego, the Orphan | 20/20/0 → 30/20/10 | War durability |
| Illyego, the Soldier | 40/40/10 → 50/50/20 | War durability + tempo |
| Illyego, the Conqueror | 60/60/20 → 70/60/30 | War durability |
| A Man Bred for War | 60/40/30 → 60/50/40 | War payoff body |
| Goblin Lieutenant | 40/30/20 → 40/30/10 | Goblin nerf |
| Goblin Captain | 60/40/30 → 50/40/20 | Goblin nerf |
| Goblin Soldier | 30/20/10 → 20/20/10 | Goblin nerf (main lever) |
| Lor'oak Goblin Commander | 50/30/20 → 40/30/10 | Goblin nerf |
| Embermaw | 40/40/10 → 40/30/10 | Wild nerf |
| Tidewretch | 50/30/20 → 40/30/20 | Wild nerf |
| Gravecreep | 40/40/0 → 40/30/0 | Wild nerf |

Deck changes (`src/data/decks.ts`):
- **War**: full rebuild — Outlaw Kael road (Captured→Runaway→Killer→The Silent) +
  Illyego engine + castable A Man Bred for War; dropped King's Blade loyal road; added
  a 2nd Rally to War and War Effort.
- **Goblin**: `Horde Frenzy` ×2 → ×1 (other slot → Stoneback).
- Loyalist, Wild: unchanged this pass (only their shared/own cards retuned).

All decks remain exactly 40 cards. Tooling added: `npm run parity` (round-robin,
multi-seed, embed-backed) + `scripts/parity.ts`.

---

## Round 7 — design directives (mix-n-match) + re-validate

Per AJ. Design intent confirmed: **decks share cards** — Kael and Arlia are
deliberately cross-deck (this supersedes the earlier "lever isolation" framing for
those characters).

1. **Kael's loyal road → Loyalist deck.** Added `Kael, Destined Trainee` ×2,
   `Swiftblade Kael` ×2, `Kael the Shadow` ×1, `The King's Blade` ×1. This is where the
   loyal road belongs: King's Blade's payoff keys off **King Honathan** (present in
   Loyalist, absent in War). Made room by cutting the redundant Thomas arc (Scared ×2,
   Soldier, Brave), `Brutal Fighter Strango` (his War-Torn buff is dead in a War-less
   deck), and 1 `Kaethlaan Archer`. Loyalist stays 40.
2. **Hresheeba line re-affiliated.** `Touched Child Hresheeba`: Attuned → **Kaethlaan**
   (a Kaethlaan child who *becomes* the Channel keeper). `Old Maid Hresheeba`:
   "Divine Channel, Attuned" → **Divine Channel** only. (Both still count in the
   Kaethlaan sphere via `KAETHLAAN_AFFILS`.)

Result (validated 6000 games/pairing, ±0.6) — **parity improved**:

```
row vs col      War Loyalist   Goblin     Wild   overall
War              —     53.4%    51.6%    48.1%   51.0%
Loyalist      46.6%       —     49.4%    49.4%   48.5%
Goblin        48.4%    50.6%       —     49.2%   49.4%
Wild          51.9%    50.6%    50.8%       —    51.1%
```

**SPREAD 2.7** (was 3.8); every deck in [48.5, 51.1]. The Kael loyal road *lowered*
Loyalist slightly — its 4-step climb to King's Blade often doesn't finish before games
end (~turn 5–6), and it replaced established bodies. No retune needed.

### Open: a Divine Channel (DC) deck
AJ flagged "might need a DC deck." Status: the DC bodies (Channel Being/Adept,
Hierophant, Old Maid Hresheeba) + `The Channel` chain + `Call of the Channel` + the
Arlia→Wandering Acolyte path are simulatable, BUT the archetype's capstone **The
Ascended** has variable `??` stats (HP/ATK/DEF = items consumed ×20) and is currently
**non-simulatable**. A DC deck can be built around the chain, but its win-con can't be
balanced in-sim until The Ascended's stat formula is modeled. **Decision pending.**

---

## Round 8 — model The Ascended + build the Divine Channel deck to 5-deck parity

AJ chose "build + model Ascended." Big round.

### The Ascended — now modeled (engine)
- `engine/types.ts`: `TransformCost.t3_items` (min T3 items, all consumed on transform).
- `data/loadCards.ts`: The Ascended becomes simulatable — base 0/0/0 + an
  `ascended_variable` flag (printed stats stay `??` in canon; they're computed at transform).
- `data/effects-map.ts`: `TRANSFORM_COST["The Ascended"] = { t3_items: 1 }`.
- `engine/transform.ts`: transforming into The Ascended consumes **every T3 item in hand**;
  HP/ATK/DEF = (count) × 20 (item stat riders don't apply, per the card). Also: ordinary
  transforms no longer burn T3 fuel (`consumeFuelBuff` skips tier-3) so the relics are
  reserved for the apotheosis. (T3 items identified by `getItemTier === 3` — CSV-driven;
  `isItem` is effect-map-gated and missed `Relic of the Forsaken`.)
  Verified: 2 T3 items → 40/40/40, 1 → 20/20/20, 0 → transform gated.

### Key diagnostic
Instrumented DC games: **The Ascended lands ~5% of games, its The Channel chain ~0%** —
the 4-step Arlia climb is far too slow for a ~turn-5 meta. So DC can't be an Ascended-combo
deck; it must be a **Divine Channel climb/midrange deck** with the Ascended as a rare bonus.

Also learned (the hard way): **win rates are decided by the early-mid game.** Nerfing T4
terminals (King's Blade 80→60 ATK) or even Honathan's aura moved Loyalist by ~0.1 — those
cards land too late. Only **early-body** stat changes and **dead-card removal** move the needle.

### Changes
- **DivineChannel deck created** (`decks.ts`), then rebuilt lean: a Channel climb deck
  (Channel Being→Adept→Hierophant; Touched Child→Old Maid; light Arlia→Ascended package),
  heavy on `Call of the Channel`/`Field Promotion` for climb consistency. Cutting the dead
  combo weight (excess Disillusioned/Relic/Ascended/Wandering, dead in the opening) was the
  single biggest DC fix: 39 → 45.
- **Divine Channel aura** added: `Old Maid Hresheeba` gains `aura_channel` (+10 ATK to your
  Divine Channel) — the archetype's payoff, à la Goblin Captain. (engine/stats.ts + text.)
- **DC body buffs** (DC-exclusive after the Channel package left Loyalist): Channel Being
  20/10/10→30/30/10, Channel Adept 30/20/20→50/40/20, Hierophant 50/30/30→60/50/40,
  Old Maid 40/10/20→50/30/20, Touched Child 20/10/10→30/20/10, Wandering Acolyte 50/40/20→60/50/30.
- **Channel package moved OUT of Loyalist** into DC (clean lever + AJ's DC-as-its-own-deck
  intent). Loyalist refocused on Kaethlaan + Kael loyal + Arlia.
- **Loyalist nerfs** (it overshot to ~60 after the rebuild; only early-body nerfs worked):
  Kaethlaan Recruit 30/20/10→20/20/10, Strango 30/20/20→20/20/10, Soldier Thomas 40/30/20→30/20/10,
  Kaethlaan Knight 50/40/30→40/30/20, Sword of the Realm 70/50/40→60/50/30, Thomas the Brave
  60/50/30→50/40/30, Captain Arlia 70/40/50→60/40/40, King's Blade 70/80/30→60/60/30,
  Kael the Shadow 50/70/10→50/60/10.
- **Honathan aura narrowed** (engine): was +10 ATK/+10 DEF to all Royal Army + King's Court;
  now **+10 ATK to King's Court only** (the board-wide buff made Loyalist a runaway). Printed
  text updated to match.

**Result — PARITY across 5 decks (validated 6000 games/pairing, ±0.6):**

```
row vs col      War Loyalist   Goblin     Wild DivineCh   overall
War              —     46.6%    51.6%    48.1%    52.3%   49.6%
Loyalist      53.4%       —     52.0%    51.7%    49.8%   51.7%
Goblin        48.4%    48.0%       —     49.2%    46.7%   48.1%
Wild          51.9%    48.3%    50.8%       —     51.9%   50.7%
DivineChannel    47.7%    50.2%    53.3%    48.1%       —    49.8%
```

**SPREAD 3.7** — every deck in [48.1, 51.7], worst matchup 3.4 off 50.

Caveat: The Ascended is *modeled and correct* but rarely fires (slow combo); DC reaches
parity as a Channel midrange deck. Making the Ascended a reliable win-con would need a
faster enabler (a future design lever), not just stats.

---

## Round 9 — Truce / protection (push the win condition toward T4, split rush vs control)

AJ: add protection cards for early bodies so late-game decks survive to their terminals —
"Truce: no attacks until your next turn" — to distinguish rush (Wild) from control (Channel).

### New mechanic: Truce (engine)
- `Player.skipCombat` flag (types.ts). `combat()` consumes it and skips the phase.
- Playing Truce sets `skipCombat` on **both** players → skips the caster's combat this turn
  AND the opponent's next combat, expiring at the caster's following turn. = "no attacks
  until your next turn."
- AI (`ai.ts > tryTruce`): plays it **defensively** — only when out-boarded (opp active ATK >
  ours) AND a real loss is imminent (a body or the Leader would die). An aggressor never
  plays it (it forfeits its own attack) — that asymmetry is the rush/control split.
- New card `Truce` (T1 Event) in canon. Distributed to the slow decks only:
  **DivineChannel ×3, Loyalist ×2**; none in War/Goblin/Wild.
- `scripts/parity.ts` now also reports AVG game length.

### Result (validated 6000 games/pairing, ±0.6)
```
row vs col      War Loyalist   Goblin     Wild DivineCh   overall
War              —     52.8%    51.6%    48.1%    53.1%   51.4%
Loyalist      47.2%       —     48.0%    49.7%    46.9%   47.9%
Goblin        48.4%    52.0%       —     49.2%    45.2%   48.7%
Wild          51.9%    50.3%    50.8%       —     48.3%   50.3%
DivineChannel    46.9%    53.1%    54.8%    51.8%       —    51.6%
```
**SPREAD 3.7 (parity held); AVG LENGTH 5.65 → 5.96 turns.**

Per-matchup texture (the design goal, working):
- Truce used by control vs rush: DC matchups 49–54% of games, Loyalist vs Wild 44%; **0%
  in Goblin/Wild** (rush mirrors never stall).
- Control matchups lengthened most (Loyalist/Wild ~7.4 turns); **DivineChannel now BEATS
  both rush decks** (Wild 51.8, Goblin 54.8) by surviving to its payoffs.

### Levers left for a *bigger* shift toward T4 (not yet applied — magnitude is AJ's call)
- A protection *family* beyond Truce (e.g. single-target "Bodyguard / Sanctuary" — more
  surgical than a full fog), distributed wider.
- Give War a Truce (midrange climb wants to reach The Silent).
- Global early-game durability (small HP bumps) to slow the clock meta-wide.
Each would push avg length higher; watch for over-stalling (timeout draws) past ~7 turns.

---

## Round 10 — the protection family (Sanctuary + Bulwark)

AJ chose "add a protection family." Two single-target protections to complement Truce's
board-wide fog — more surgical, so a control deck shields one key body instead of skipping
all combat.

### New cards + engine
- **Sanctuary** (T1 Event): "Until your next turn, a character you control cannot be
  attacked." Engine: `Unit.shielded`; excluded from `reachable()` and chain target pools.
- **Bulwark** (T1 Event): "Until your next turn, a character you control has +30 DEF."
  Engine: `Unit.tempDef`, added in `effDef`.
- Both clear at the controller's next `startOfTurn` (same lifecycle as a "until your next
  turn" effect). Clone-safe (spread copy).
- AI (`ai.ts > tryProtect`): shields the highest-value body the opponent's biggest swing
  would KO next combat; prefers **Bulwark** when +30 DEF alone saves it (cheaper), else
  **Sanctuary**. Then `tryTruce` handles board-wide threats.

### Distribution (control/midrange only — rush gets nothing, by design)
- DivineChannel: Truce ×2, Sanctuary ×2, Bulwark ×1
- Loyalist: Truce ×2, Sanctuary ×1
- War: Sanctuary ×1 (midrange climb to The Silent)
- Goblin, Wild: none (pure rush)

### Result (validated 6000 games/pairing, ±0.6)
```
row vs col      War Loyalist   Goblin     Wild DivineCh   overall
War              —     53.1%    52.0%    47.8%    52.9%   51.4%
Loyalist      46.9%       —     47.6%    51.0%    45.5%   47.8%
Goblin        48.0%    52.4%       —     48.9%    46.4%   48.9%
Wild          52.2%    49.0%    51.1%       —     49.4%   50.4%
DivineChannel    47.1%    54.5%    53.6%    50.6%       —    51.5%
```
**SPREAD 3.4 (parity held); AVG LENGTH 5.93 turns.** Usage: Truce 23% of games,
Sanctuary 11%, Bulwark 8% — all live, none dead. Control still earns its edge vs rush
(DivineChannel beats Goblin 53.6 / Wild 50.6). The protection category is now a real
deckbuilding axis: rush decks run zero, control decks run 3–5.
