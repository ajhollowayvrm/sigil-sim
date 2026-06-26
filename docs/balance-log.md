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

---

## Round 11 — Loyalist thematic rework ("Defense of the Kingdom; sustain and continue")

A *fit* round, not a tuning round. Loyalist rated ◐ "slightly diluted": it owned the best
defensive toolkit but won/lost like everyone else (turn-4–5 Leader-kill races; its outlast
identity only fired vs Wild). The culprit was the Kael ASSASSIN road (Kael the Shadow ->
The King's Blade) — a lone tempo Leader-sniper pulling the deck toward racing. Goal: make the
mechanic BE the identity, like War's attrition. The wall holds, then the Royal Army strikes as one.

### Changes (`decks.ts` `deckLoyalist` only — no engine change)
- **Out:** Kael the Shadow, The King's Blade (assassin road); Mage Arlia (caster/DivineChannel
  branch); the Thomas filler line; the Instructional equips.
- **In (bodyguard Kael):** Second in Command Kael — "At Her Side" redirect (already engine-modeled).
  Kael stays mix-n-match (War's outlaw road / Loyalist's bodyguard road) but here he SHIELDS.
- **In (army-chain finish):** 2nd Captain Arlia (Triangle Attack), Strango ×2 kept (Drill Formation),
  Honathan's Rally the Realm — the coordinated Royal Army chains are the win condition.
- **In (sustain shell, all modeled):** Medical Advancement (+10 Max HP, Plague's math-opposite),
  Bulwark ×2, 2nd Reinforce, 2nd Sanctuary, 2nd Squire Arlia (redirect wall), Conscription Order ×2.
- Considered and rejected: War College (no-op — transforms are free here), Shield Wall (unmodeled),
  Hardened Veterans / Rally to War (war-gated; Loyalist runs no War).

### Result (parity 800×4 = 3200/pairing, 6 decks)
```
row vs col      War Loyalist   Goblin     Wild DivineCh   Plague   overall
War              —     54.7%    51.9%    46.7%    57.4%    51.4%   52.4%
Loyalist      45.3%       —     48.8%    57.8%    54.3%    42.4%   49.7%
Goblin        48.1%    51.2%       —     41.2%    50.3%    48.4%   47.8%
Wild          53.3%    42.2%    58.8%       —     54.7%    49.4%   51.7%
DivineChannel    42.6%    45.8%    49.7%    45.3%       —     41.4%   45.0%
Plague        48.6%    57.6%    51.6%    50.6%    58.6%       —    53.4%
```
**Loyalist overall 47.8% -> 49.7% (now best-centered deck); AVG LENGTH 5.90 turns.** The fit
landed where theme predicts: Loyalist now BEATS rush (Wild 57.8%, DivineChannel 54.3%) by
outlasting — the Wild matchup runs 8.6 turns with **5% ending in Wild decking out** (the wall
holds; the rush breaks on it). It LOSES to attrition that out-grinds a wall: War 45.3% (races
faster than the wall sets up) and Plague 42.4% (out-sustains the sustain deck — "weaken + bask
in immunity" going over the top on the Max-HP axis). Both are thematically *correct* losses.
The deck's wins now come from its identity, not from a grafted-on assassin. ◐ -> ★.

Round-wide, DivineChannel (45.0%) remains the weak deck (known) and the 6-deck spread is 8.5 —
driven by DC and Plague, not by this change.

### Investigated: Loyalist 42.4% vs Plague — RESOLVED, no change (the Dispel theory was wrong)
Suspected the AI was under-prioritizing Dispel (Loyalist's Plague answer). Instrumented a 3000-game
Loyalist-vs-Plague diagnostic (per-winner end-reasons + Dispel draw-vs-play gap). Findings:
- **Dispel is used efficiently, not under-prioritized.** `tryRemoval` fires it unconditionally on
  the first turn {Dispel in hand + a T2+ body + Plague on board} all hold (priority list heads with
  Plague). Drawn 46.6% (≈ what 2-of-40 predicts), played 22.0%, and "held on Plague but never played"
  is only **3.0%** (timing noise — it removes Plague mid-main-phase). The 22% ceiling is draw, not AI.
- **The Plague field is a red herring for this matchup.** Bumping Loyalist to Dispel ×3 raised usage
  (22%→25%) but moved the matchup the WRONG way (44.8%→43.8%, swapping out a consistency tutor hurt
  more than extra field-removal helped). The loss is driven by Plague's **immune bodies** (the
  Experiments/Seremins kill Loyalist's Leader: 1558 of Plague's wins are "leader" at avg turn 6.3),
  not the −10 Max-HP field.
- **The matchup is thematically correct and left as-is.** Plague ("weaken the enemy and bask in
  immunity") is designed to out-grind a defensive/value deck; a 55–45 on-theme loss is healthy.
  Closing it would require beating immune *bodies* (faster/wider army chains or a tech answer), which
  risks the on-theme Wild win and isn't warranted. No deck or engine change.

---

## Round 12 — Divine Channel fit + PER-DECK AI policies (architecture)

Goal: make The Ascended apotheosis ("amazing potential, hard to get it all out") actually FIRE.
It was firing **0%** of games in the sim. Root causes found and fixed, plus a new architecture.

### Genuine fixes (keep regardless — correctness + general)
1. **Engine: The Ascended consumes ANY-tier items, not just T3** (`transform.ts`). The card reads
   "items discarded during transformation ×20"; the "1+ T3" is only the entry gate. The model
   counted T3-only, so the capstone was tiny. Now it eats every item in hand → a 160-stat god whose
   The Channel wipes for ~320. (TODO(v0.8): "ability-grant riders still apply" not yet modeled.)
2. **AI bug: `pickDiscard` valued every non-character at a flat 10** (`effects.ts`), so discard-tutors
   (Call of the Channel) paid their cost with the deck's own combo pieces (Disillusioned, relics).
   Now items are valued by tier and transform-gates protected; `tryTutors` also won't pay a discard
   worth more than the fetch. Helps every tutor deck; zero parity regression.

### New architecture: per-deck AI policies (AJ's idea)
The generic greedy AI is myopic by design (scores one ply out), so it can never pilot a deep combo —
it can't see The Ascended (printed stats "??" → 0) or its combat-phase board-wipe, and won't shelter
fragile climbers. So policies are now **per-deck** (the brief always intended swappable policies):
- `game()` accepts `Policy | [Policy, Policy]` and resolves one per side; `POLICIES` registry +
  `policyFor(deck)`; `batch.ts` and `recordGame()`/WatchBoard pass each deck's policy. Defaulting all
  to greedy is **byte-identical parity** (determinism verified).
- `divineChannelPolicy` delegates everything ordinary to greedy but: pre-attaches Disillusioned to a
  Mage (unlocking Opportunity, which needs a *lingering* Disillusioned character, and pre-paying the
  Acolyte gate); forces the one step greedy refuses (Acolyte → The Ascended); shelters the Acolyte
  before it ascends; fronts the finished god to fire The Channel.

### Result — the combo now fires, but hits a hard ceiling
With the policy, The Ascended/The Channel go from **0% → ~1%** of games, and when they land it's a
240–340 board-wipe. But **assembly caps at ~3% (reach Acolyte)** no matter how hard we push (tried:
relic hoard, dual-purpose items, Disillusioned ×3, Opportunity ×2, aggressive vs minimal climb,
shelter-all vs shelter-imminent). The wall is structural: a **4-deep transform line at 1 transform/
turn against a ~6-turn clock**, gated by card-availability (Acolyte ×2 in hand when the Mage is up)
and climber survival. Pushing the combo costs win-rate — DivineChannel **45.0% → 42.4%** (the
combo-package slots are weaker than a pure-Church build, and ~1% firing doesn't pay for them).
Other five decks unchanged (War 53.3 / Loyalist 49.6 / Goblin 48.8 / Wild 52.8 / Plague 53.0).

### Conclusion / open decision
The per-deck architecture is the right foundation and is in place; the any-tier + discard fixes are
correct. But **the only route to the intended 15–20% payoff is shortening the canon line** (a shallow
Church/Channel path to The Ascended, or dropping the Disillusioned gate) — exhaustively demonstrated.
That was declined earlier in favor of the AI path; the AI path is now proven insufficient on its own.
Decision pending: (a) shorten the canon line (unlocks the combo, pairs with the work done), or (b)
accept the combo as a rare-but-spectacular bonus and tune the DC deck back toward a competitive
Church (~45%). The architecture supports either.

---

## Round 13 — Divine Channel consistency cards (The Open Channel + Seeping Doubt)

Two new DC cards toward "make T3 viable," driven by the finding that T3 is gated by drawing the
right pieces (not the transform-action count). Both are clean and PARITY-ISOLATED — the other five
decks are byte-identical with them in the pool.

- **The Open Channel** (T1 Persistent Event / The Divine Channel): "Play only while you control a
  Divine Channel character. At the start of each of your turns, search your deck for a form one of
  your characters can transform into, add it to hand." A slot-cost persistent tutor (repeatable
  Field Promotion). The play-condition locks it to DC, so the climb-consistency can't leak to aggro
  (a free GLOBAL version sent climb decks to 56%+ and broke parity — measured).
- **Seeping Doubt** (T2 Persistent Event): "At the start of each of your turns, choose a character
  you control and flip a coin; on heads, it becomes Disillusioned." A repeatable coin-flip
  Disillusioned source for the wanderer/apotheosis transforms when one-shot Disillusioned is scarce.

### Honest result — clean cards, but they don't move the combo (it's clock-gated)
Both work mechanically (Open Channel played ~33%, Seeping Doubt ~16%), but DC's apotheosis is
unchanged (Acolyte ~3%, Ascended ~0.8%) and DC win-rate is flat (~42%, vs ~43% without them — the
slot costs roughly offset the consistency). The reason is structural: **The Ascended is a ~5-gate
conjunction** (Mage on board + survives + Acolyte card + Disillusioned + a T3 item + Ascended card,
all inside a ~6-turn clock). Fixing ONE gate (forms, or disillusion) doesn't compound — the others
still bind. Seeping Doubt in particular rarely lands a USEFUL hit (~0.3%): disillusion doesn't carry
through the Arlia→Mage transform, so it must catch the Mage in a ~1-turn window before it dies in
the active zone.

These are good additions to the card POOL (they texture the archetype and are real deckbuilding
options), but the standing conclusion holds: **T3 viability and the apotheosis are gated by the
CLOCK.** Across action-economy, global consistency, DC-locked consistency, and now a disillusion
engine, the only lever that actually makes T3 land is slowing the game (durability / §5 Leader
durability) — still the unaddressed root cause.

---

## Round 14 — Divine Channel durability (parity via the weak deck, not the clock)

Pursuing "make T3 viable," a global Leader-HP bump DID slow the clock and raise T3-landing
(22%->29% at +30) — but it was inherently ANTI-AGGRO (slower games let climb decks reach payoffs;
Wild fell 54%->43%). The fix (AJ's call): scope the durability to DIVINE CHANNEL CARDS ONLY.

### Change (`engine/stats.ts`)
- `DC_DUR_HP = 25`: every Divine-Channel-affiliated character enters with +25 Max HP, applied to the
  base stats (entry HP in `makeUnit` + the ceiling in `effMaxhp`, so it fills rather than capping).
  `isDivineChannel` keys off the "Divine Channel" affiliation — exclusive to the DC clergy + The
  Ascended, so NO other deck is touched. (The shared Arlia apotheosis line isn't DC-affiliated, so it
  stays as-is; this buffs DC's consistent Church plan-B, the bulk of its wins.)

### Result (parity 800x4 = 3200/pairing)
```
row vs col      War Loyalist   Goblin     Wild DivineCh   Plague   overall
War              —     54.7%    51.9%    46.7%    55.5%    51.4%   52.0%
Loyalist      45.3%       —     48.8%    57.8%    49.9%    42.4%   48.8%
Goblin        48.1%    51.2%       —     41.2%    47.3%    48.4%   47.2%
Wild          53.3%    42.2%    58.8%       —     48.8%    49.4%   50.5%
DivineChannel    44.5%    50.1%    52.8%    51.2%       —     44.2%   48.6%
Plague        48.6%    57.6%    51.6%    50.6%    55.8%       —    52.9%
```
**DivineChannel 44.2% -> 48.6%; SPREAD 11.1 -> 5.6 (tightest of the project); AVG LENGTH 5.96 (the
global clock is UNCHANGED — no anti-aggro shift).** Every deck now sits 47-53%. Sweep showed DC
plateaus ~48.6% by +25 (more HP doesn't help — DC's residual gap is matchup/combo, not fragility),
so +25 is the efficient value. The other decks moved only by facing a tougher DC (healthy), not by
any internal change.

Note: this did NOT solve meta-wide T3 viability (global T3-landing still ~24% — the clock didn't
change). It traded that broader goal for fixing DC's weakness parity-safely. Meta-wide T3 viability
still wants the global durability/clock lever + an aggro re-tune (deferred — it's a bigger round).

---

## Round 15 — "The Crown" benchmark deck + the gauntlet (a balancing tool)

Built the strongest deck the gauntlet could find and kept it as a fixed power-ceiling reference.

- **The Crown** (`deckCrown`, in `BENCHMARK_DECKS` — NOT a balanced archetype, EXCLUDED from parity):
  Royal Army control. Honathan's untargetable-Leader rule (unkillable while you hold a Royal Army
  body) + the Kael assassin road (Swiftblade -> Shadow -> The King's Blade) to snipe THEIR Leader,
  + tutors / protection / an anti-Plague package. ~62-64% vs the whole field — beats every deck.
- **`npm run gauntlet`** (`scripts/gauntlet.ts`): runs each balanced archetype vs each benchmark and
  ranks the field by resilience. The deck registry now splits `DECKS` (6 balanced, parity) from
  `BENCHMARK_DECKS` (red-team), with `ALL_DECKS` for the UI/batch; `runMatch` uses `ALL_DECKS`.

### Using it as a balancing tool
The benchmark is a FIXED strong opponent, so the field's win-rate against it is an absolute
resilience yardstick (parity only measures the decks relative to EACH OTHER — it can't see a
meta-wide power gap or a shared exploit). First gauntlet (1000/matchup):
```
field avg 36.3% vs Crown   (Crown ~64%)
Plague 43% · War 43% · Goblin 39% · DivineChannel 32% · Loyalist 31% · Wild 31%
```
Reads: every deck is well below 50% vs Crown, so the Honathan-untargetable + assassin combo is
above the set's intended ceiling (a nerf candidate). Wild/Loyalist have the biggest gaps (the
walled-out aggro/value decks); Plague resists best (immune bodies). As cards/decks are tuned, track
each deck's gauntlet number — closing toward ~45-50% means the field can stand up to a strong build;
a deck that craters flags an exploit to patch. Add more benchmarks (e.g. a combo or aggro ceiling)
to triangulate.

---

## Round 16 — benchmark roster: Vanguard (Crown-counter) + Plaguelord; Royal Army dominance

Asked for a deck to counter The Crown plus "other really good decks." Built and tested candidates
(Plague control, Goblin blitz, War outlaw, aggressive Plague, Royal Army tempo) against Crown + the
field. Added two to BENCHMARK_DECKS.

- **Vanguard** — the COUNTER to Crown (~50% head-to-head across seeds) and a top deck (~60% vs the
  field). Same Royal Army engine, but TEMPO not control: lighter answers, more bodies + reach
  (Sniper/Archer) + a pump. It out-races the slower control Crown.
- **Plaguelord** — the strongest NON-Royal-Army build (aggressive immune Experiments + the field).
  ~45% vs Crown, ~48% vs field — a grind-style reference, NOT a power ceiling.

### The finding: Royal Army is over the ceiling
Full gauntlet (1000/matchup) — field win-rate vs each benchmark:
```
vs Crown      36.3%   (Crown ~64%)   Plague 43 best · Wild/Loyalist 30 worst
vs Vanguard   39.4%   (Vanguard ~61%) Plague 46 best · Loyalist 34 worst
vs Plaguelord 51.9%   (Plaguelord ~48%) Plague 56 · Loyalist 45
```
BOTH apex decks are Royal Army (Honathan + the Kael assassin road + cheap Royal Army bodies). NO
non-Royal-Army build tested broke ~52% vs the field — the best non-RA (Plaguelord) sits *below* it.
So the Royal Army package is above the set's power ceiling: it has the best body-wall (Leader safe
behind cheap Royal Army flood), the only Leader-snipe (King's Blade, hit_leader), and strong tutors.
A nerf candidate if you want archetype diversity at the top — likely the King's Blade's unconditional
hit_leader snipe and/or the cheap-body Leader wall. Plague is consistently the most RESILIENT
archetype (best field-resister vs all three benchmarks); Wild/Loyalist are the most fragile.

---

## Round 17 — WHY Royal Army is so good (ablation study): it's CONSISTENCY, not the exploit

Ran ablations on The Crown (knock out each component, measure win-rate vs the field, 800/matchup,
two seeds) + instrumented the leader-exposure asymmetry. The result OVERTURNS the R16 hypothesis.

### Ablation — Crown win-rate vs field (base ~61-63%), delta from removing each piece:
```
− King's Blade (the snipe)   +1.2   ← removing it HELPS; the snipe is a T4, present only 4.4% of plies
− whole assassin road        -2.0   ← minor
− Honathan                   -0.5   ← negligible (untargetable is redundant — proven earlier too)
− tutors (Conscription/FP)   -6.8 / -7.7  ← BY FAR the biggest drop
− protection (Truce/Sanc/Bulw) +3.2  ← removing it HELPS (situational dilution)
− Dispel                     +4.2   ← removing it HELPS most
Crown-max (tutors+bodies, NO protection/Dispel/assassin)  +2.8 / +3.1 → ~65%  ← the strongest build
```
### Mechanism — leader exposure is SYMMETRIC (so it's not a wall):
```
Crown's leader exposed to normal attack: 30.5%   |  opponent's: 26.8%   (≈ equal — no wall asymmetry)
Crown controls a Leader-snipe (King's Blade): 4.4% of plies  |  opponent: 0%   (snipe barely happens)
```

### Conclusion
Royal Army is strong because it is the most **CONSISTENT, COHERENT body deck**, full stop. The
affiliation-locked tutors (**Conscription Order** = fetch any Royal Army character, **Field
Promotion** = fetch the next form) + a deep pool of cheap, redundant, solid bodies mean it curves
out a strong board EVERY game and out-tempos less-consistent archetypes in the normal leader race.
The flashy pieces we suspected — King's Blade's snipe, Honathan's untargetable wall — are
near-irrelevant (removing them is neutral-to-positive), and the situational suite (protection,
Dispel) actively DILUTES the curve.

Balance implication (corrects R16): nerfing the King's Blade or Honathan will NOT pull Royal Army
back — they aren't the source. The real levers are CONSISTENCY and BODY DEPTH: tone down the Royal
Army tutors (Conscription Order is a no-cost fetch-anything) and/or the redundancy of the cheap body
pool — OR, better for the set, give the other archetypes comparable consistency tools so they can
curve out as reliably. (Caveat: the greedy AI may under-value protection/Dispel, inflating how
"negative" they look — but the consistency result is large and seed-stable.)

---

## Round 18 — test: give every archetype a Crown-quality affiliated tutor

Followed R17 (Royal Army wins on consistency) by giving each balanced deck a Crown-level tutor
package (3x its affiliated character-tutor + 2x Field Promotion, cutting only fodder items/protection,
never bodies or engine events). Win-rate vs field · vs Crown, base -> boosted, two seeds:
```
Loyalist       +3.8 field · +3.3/+2.0 vs Crown   <- big winner
DivineChannel  +1.6/+1.8  · +1.5/+2.5            <- modest winner
War            +0.3/+0.5  · ~0                   already consistent (War Effort x2 + FP x2)
Wild           ~0         · ~0                   no help
Goblin         -0.6/-0.7  · ~0                   no help
Plague          0         ·  0                   already runs the package (Patient Intake x3 + FP x2)
```
### Finding: a tutor's value = consistency × the QUALITY of what it fetches
The hypothesis is only partly right. Tutors help proportional to the body pool behind them:
- Loyalist gains most because Conscription Order fetches the SAME deep, strong, interchangeable
  Royal Army pool that makes Crown great.
- Plague gains nothing because it ALREADY runs Crown-level consistency — which is exactly why it's
  the most resilient archetype (validates R17).
- Goblin/Wild gain nothing because their tutors fetch WEAK/narrow pools; their problem is body
  quality, not consistency. More tutoring just finds more mediocre bodies.

So Royal Army's edge isn't the tutor alone — it's the tutor sitting on a deep pool of cheap,
interchangeable, perfectly-good bodies. Path to competing: consistency AND a quality pool.

### Actionable
- Loyalist: a clean buff (+1 Conscription Order + a Field Promotion) lifts it ~48% -> ~52%, no new
  cards — closes a real gap.
- Goblin / Wild: need BODY power, not tutors.

---

## Round 19 — Fusion mechanic + Wild's "Primal Fusion" (body buff = go-wide payoff)

Per R17/R18: Goblin/Wild need BODY power, not consistency. Added a FUSION mechanic for Wild's body
buff — framed so it leverages (not fights) the go-wide flood, the way the analysis pointed.

- **Engine** (`transform.ts fuse`): merge one body into another — the keeper gains the other's BASE
  stats (template + its own mods, not auras), current HP, and banked kills; the consumed body + its
  equipment leave play. Keeper retains its form (a fused T1 Wild can still Metamorphose). No
  transform action used.
- **Primal Fusion** (T1 Event, Wild-locked by text): fuse two Wild creatures + draw a card. The
  draw is the "still helps you get out more bodies" piece — you cash spare chaff into one threat
  that punches through DEF and refill toward the next wave. AI fuses the two strongest Wilds when it
  controls 3+ (so the board stays wide).

### Result (parity 700×3)
Tuning: ×3 → Wild 57.8% (overshot), ×2 → 56.2%, **×1 → 53.5%** (kept). Wild was ~50%; the fusion is
a clear, identity-true buff — it finally gives the low-ceiling rush a ceiling. SPREAD 5.6 → 6.7.
Side effect: Wild now beats Goblin ~62% (the go-wide mirror) — Goblin (46.8%) is now the weakest and
wants its own body payoff next.
