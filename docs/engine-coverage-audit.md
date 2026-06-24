# Engine coverage audit — every card vs. what the engine does

Method: read each printed card (Characters / Events / Items CSV) and trace it to the
engine's handling — `effects-map.ts` (text→primitive mapping), `stats.ts` (effAtk/effDef/
effMaxhp), `combat.ts` (chains, targeting), `effects.ts` (entry/HoT/wars/cleanup),
`transform.ts` (transform/forge/morph/Ascended). Verdict per card:

- ✅ **modeled** — printed effect is faithfully implemented.
- 🟡 **partial** — main effect modeled; a rider is stubbed (noted).
- 🟦 **stub (intended)** — CLAUDE.md §6 says approximate/don't fake (no enabling cards exist).
- 🔴 **gap (fixed this pass)** — was unintentionally dead; now wired.
- ⚪ **gap (open)** — not modeled; not in any sample deck; flagged for a decision.
- **vanilla** — no printed ability; a plain statline (correct by construction).

Note on the AI: the engine *rules* can be correct even when the greedy board-eval **AI**
won't use a card. Pure card-advantage (draw, deck-dig) doesn't change the board score, so
the AI under-values it — called out where relevant.

---

## Characters

All characters not listed below are **vanilla statlines** (no printed ability) — handled
correctly by default: Arlia Destined Trainee, Kael Destined Trainee, Swiftblade Kael,
Kael the Captured (enters War-Torn via its `War-Torn` affiliation ✅), Kaethlaan Recruit/
Knight, Sword of the Realm, Touched Child Hresheeba, Channel Being, all common Wild
creatures (Thestral, Barangrang, Cinderpel, Bogfang, …), the T2 Wild terminals' bodies,
Goblin Soldier/Lieutenant, Lor'oak Goblin Grunt, Thomas/Soldier Thomas, etc.

| Card | Printed ability | Verdict |
|---|---|---|
| Mage Arlia | entry: 10 to own Mages Guild; aura +10 ATK Mages Guild | ✅ `dmg_mages` + `aura_mages` |
| Squire Arlia | Me for You (redirect an attack to her) | ✅ **bodyguard redirect** (`redirect_meforyou`) — intercepts an individual attack once/opponent's-turn with +10 DEF; `combat.ts` `chooseRedirect` |
| Arlia, Youngest Archmage | Magical Shield (negate+destroy) | ✅→inert (`magical_shield`): wired through `protection.ts` `resolveTargetedEffect`, but no destroy card exists to trigger it (verified by test) |
| **Captain Arlia of the Royal Army** | My Liege: +30 ATK/DEF while Honathan in play; untargetable by manipulation; no change-control | ✅ **+30/+30** (`my_liege`) + the manipulation/no-control clauses now wired (`manip_immune` → `protection.ts`); the clauses are inert (no manipulation cards) but tested |
| The Wandering Acolyte Arlia | Seeker (look at top 3, reorder) | ✅ **Seeker** (`seekerReorder` + AI `trySeeker`): once/turn, orders the next draws toward the climb |
| The Ascended | Absolute Truth (stats = T3 items consumed ×20); The Channel AoE chain | ✅ modeled (variable stats + AoE chain) |
| Kael the Shadow | hit passive zone; +10 ATK w/ Honathan | ✅ `hit_passive` + `honathan_buff` |
| The King's Blade | hit any/Leader; +20 ATK & draw-on-KO w/ Honathan | ✅ `hit_leader` + `draw_on_ko_if_honathan` (+ aura/honathan_buff sum ≈ +20 ATK) |
| Kael the Runaway | Masterless (no aura benefit) | ✅ `no_aura` |
| Kael the Killer | Blood Money (+10 ATK/banked kill); no aura | ✅ `blood_money` + `no_aura` |
| The Silent | must-attack; hit passive; +20 vs ATK≥50; no aura | ✅ `hit_passive`/`high_atk_bonus`/`no_aura`; 🟡 **must_attack has no behavioral effect** (the all-out planner already attacks with everything) |
| Second in Command Kael | At Her Side (redirect to protect Arlia) | ✅ `redirect_atherside`: redirects attacks declared at an Arlia onto him; +10/+10 static while you control Arlia (`combat.ts` + `stats.ts`) |
| King Honathan of Kaethlaan | aura +10 ATK to King's Court; Leader untargetable while you control Royal Army | ✅ `aura_honathan` (King's Court +10 ATK) + `leader_protect_royal` *(aura was narrowed from Royal-Army-wide +10/+10 in balance Round 8; printed text matches)* |
| Illyego (Orphan/Soldier/Conqueror) | War Child (attack through War-Torn); Conqueror +10 ATK in War | ✅ `war_child` + `war_atk` |
| The Acolyte Illyego | At Peace (cannot become War-Torn) | ✅ `cannot_become_wartorn` |
| Goblin Captain | Command (+10 ATK other Goblins) | ✅ `aura_goblin` |
| Old Maid Hresheeba | Keeper (shrink DC chain by 1) + +10 ATK DC aura | ✅ `keeper_channel` + `aura_channel` |
| Hierophant of the Channel | Keeper (shrink DC chain by 1) | ✅ `keeper_channel` |
| Channel Adept / Lumenkit / Hollowed Stag | on-enter heal 10 | ✅ `heal_lowest` |
| Embermaw | on-enter 10 to an opposing active | ✅ `dmg_opp_active` |
| Murlifect / Craghide | Regrow (heal 10 start of turn) | ✅ `regrow` |
| A Man Bred for War | castable standalone; +20/+20 & may attack while War-Torn | ✅ `CHAR_PLAY:0` + `forged_in_chains` |
| Brutal Fighter Strango | enters War-Torn, fights through, +20/+20 | ✅ `War-Torn` affil + `forged_in_chains` |
| Kaethlaan Archer / Sniper | hit passive; Sniper +20 vs ATK≥50 | ✅ `hit_passive` (+ `high_atk_bonus`) |
| Thomas the Brave | Unflinching (cannot become War-Torn) | ✅ `cannot_become_wartorn` |
| Chain cards (Lor'oak Commander, Strango, Skirrl, Captain Arlia, Honathan, Arlia Archmage, The Ascended) | printed chains | ✅ generic chain engine (size/affil/formula/zone/element-amp/AoE/keeper) |
| Love-road cards (Arlia Kael's Wife, Kael Arlia's Husband, Mourning Widower) | TBD stats | n/a — `??`/TBD → non-simulatable, browse-only (correct) |

---

## Events

| Card | Verdict |
|---|---|
| War / Holy War / Goblin War | ✅ start-of-turn attrition both sides, exemptions, burnout coin-flip, Holy War capture |
| Taken Prisoner | ✅ confers War-Torn; gates the outlaw road |
| Rally to War / Crusade / Horde Frenzy / Hardened Veterans | ✅ wartime buffs + immunity + on-KO draw |
| The Broken March | ✅ War-Torn may attack + War-Torn swarm chain |
| Close the Gates | ✅ Kaethlaan war-attrition immunity |
| Metamorphosis | ✅ T1 Wild → any T2 Wild in hand, free action, keeps kills |
| Reinforce the Front Lines | ✅ on-play heal 20 |
| Field Promotion / War Effort / Warren Muster / Call of the Wild / Conscription Order / Call of the Channel | ✅ tutors (form / affiliation; Channel has its discard cost) |
| **Truce / Sanctuary / Bulwark** | ✅ protection family (skip-combat / untargetable / +30 DEF) |
| Disillusioned | ✅ wanderer gate (hand-consumed legacy path **or** the new state); its "Disillusioned body can't use your auras" rider is now modeled via the state |
| A Crisis of Faith / Cast Out | ✅ confer the **Disillusioned state** (satisfy the wanderer gate). 🟡 their persistent riders (A Crisis +10/−10 while attached; Cast Out affiliation-strip) are approximated — A Crisis's on-enter draw is modeled |
| The Long Road | ✅ now playable (in `PERSIST` + AI plays it with a Wandering/Faithless body); heals it 10/turn |
| Opportunity | ✅ extra transformation action (per-turn `extraTransforms`; gated on controlling a Disillusioned body) |
| War College | ⚪ **no-op by design** — transforms don't cost items in this engine, so "1 fewer item" has nothing to reduce. Left unfaked (a `// NOTE` in `PERSIST`); needs a rules decision, not a code fix |
| Plague / Medical Advancement | ⚪ Max-HP modifiers — **deferred** to the future Plague deck |
| Shield Wall | ⚪ Kaethlaan Knight DEF buff — not modeled (not in any deck) |

None of the ⚪ events are in the five sample decks, so they don't affect the parity numbers.

---

## Items

Equipment / fuel / on-play now mapped in `EQUIP` / `FUEL` / `ONPLAY`. **Fixed this pass**
(were unmapped = dead): Staff of Aelion, Carrion Blade, Feliefnir (stats), Goblin War-Banner
(base), Sanctified Blade (base), Apprentice's Grimoire, Squire's Oathblade, Archmage's Focus,
Relic of the Forsaken, Banner of the Realm (as fuel), Reagent Pouch (draw).

| Card | Verdict |
|---|---|
| Stat equips (Instructional Sword/Tome, Back-Alley, Twin Daggers, Tower Shield, Vital Charm, Berserker's Brand, Aegis Plate, Rough/Tempered/Masterwork, Round Shield, Goblin Shiv/Cleaver/Maul, Kaethlaan Bow/Broadsword, Kael & Arlia & Khaneris signature lines, **Staff of Aelion**, **Carrion Blade**) | ✅ stat mods (incl. `fire_atk` for Staff of Aelion) |
| Tidecaller's Pearl | ✅ +20 ATK, +10 if Water |
| Kaethlaan Banner | ✅ +10 DEF bearer + army-wide +10 ATK Kaethlaan aura |
| Warmonger's Resolve | ✅ +20 ATK in War (play-gated on a War) |
| Unbroken Will | ✅ immune to War-Torn + attack-through |
| Fuel (Whetstone, Buckler, Warlord's Spoils, **Apprentice's Grimoire**, **Squire's Oathblade**, **Archmage's Focus**, **Relic of the Forsaken**) | ✅ consumed in transform → stat buff on resulting form |
| Field Rations | ✅ on-play heal 10 |
| **Reagent Pouch** | ✅ draw wired + an AI heuristic (`tryDraw`) cycles it eagerly once a body is out. (Not in any sample deck currently — was dropped from DC in Round 10.) |
| **Banner of the Realm** | ✅ consumed in a Kaethlaan transformation → grants the resulting form the Rally chain (Chain 2 Kaethlaan Knights); verified it fires in combat |
| **Feliefnir** | ✅ +30/+30/+10 stats wired; "untargetable by opponent's equip effects" now wired (`opponentEquipTargetImmune` → `protection.ts`), inert (no opposing equip targets another card) |
| **Goblin War-Banner** | ✅ +10 ATK, or +30 (instead) while a Goblin War is in play; Goblin-only bearer |
| **Sanctified Blade** | ✅ +10 ATK; Light-only bearer; its Light bearer can't be targeted by Dark attackers (solo or chain) while Holy War is in play |
| Protection of The Divine | ✅ bearer ignores ALL item/event effects (friendly + hostile): equip stats, event auras (Rally/Crusade/Horde/Banner), war attrition, item/event heals, Bulwark/Sanctuary — keeps Leader bonus, character auras, own intrinsic ability (`immuneItemEvent` in `stats.ts`). TODO(v0.8): confirm exact scope (card is RECONSTRUCTED) |
| Royal Warrant | 🟡 "counts as any named item" is moot — transforms never *require* a named item in this engine |

---

## Remaining open gaps

1. **Max-HP modifiers (Plague / Medical Advancement).** Deferred — AJ plans a Plague/Max-HP
   deck later; we'll build the cap-only HP subsystem then.
2. **War College** — no-op *by design* (transforms cost no items in this engine). Not faked;
   needs a rules decision (e.g. make some transforms item-costed) before it can mean anything.
3. ~~Redirect / negate / immunity / Seeker~~ **FINISHED** (see below).

Items 1–2 are out of the five sample decks, so none affect the parity numbers.

## Redirect / negate / immunity / Seeker — finished (was item 3)
Per AJ's "finish these," the former §6 stubs are now implemented and tested
(`test/effects-stubs.test.ts`); parity held (spread ~5.3, AVG length 5.83):

- **Live** (an enabler — attacks / a deck / friendly effects — already exists):
  - **Me for You** (Squire Arlia, in Loyalist) — bodyguard redirect, once/opponent's-turn, +10 DEF.
  - **At Her Side** (Second in Command Kael) — redirect attacks at an Arlia onto him; +10/+10 while controlling Arlia.
  - **Seeker** (Wandering Acolyte Arlia, in DivineChannel) — once/turn top-3 deck reorder; AI orders the next draws toward the climb.
  - **Protection of The Divine** — bearer ignores all item/event effects (friendly + hostile). Live because friendly auras/heals/wars exist; not in any sample deck.
- **Inert but wired** (correct rule, but the pool prints no offensive card to set it off — `src/engine/protection.ts`, unit-tested via a synthetic source):
  - **Magical Shield** (negate-and-destroy a destroying effect) — no destroy card exists (the ruleset now permits them; this is the forward hook).
  - **Feliefnir** anti-opponent-equip clause — no opposing equip targets another card.
  - **My Liege** manipulation-immunity / no-change-control — no manipulation card exists.

These honor §6 ("approximate, don't fake"): the redirect/Seeker/immunity mechanics are real, and the
inert trio are the real rule routed through one gate (`resolveTargetedEffect`) rather than a fake.

## Fixed in the gap-closing pass (all balance-neutral — spread held at 3.4)
- `my_liege` (+30/+30 with Honathan) wired.
- `fire_atk` + `draw` added; 11 previously-dead items mapped; on-play `draw` in AI + interactive.
- **Conditional equips** — Goblin War-Banner (+30 in a Goblin War; Goblin-only) and Sanctified
  Blade (Light-only; Dark attackers can't target it under Holy War, solo + chains).
- **Banner of the Realm** — chain-grant on a Kaethlaan transform (verified it fires).
- **Opportunity** — extra transform action (`extraTransforms`), used by the transform loop.
- **Disillusioned state** — `Unit.disillusioned`: conferred by A Crisis of Faith / Cast Out,
  denies the bearer your auras, and satisfies the wanderer transform gate; The Long Road and
  Opportunity hang off it. (Plain Disillusioned keeps its atomic hand-gate path, so DC is
  unchanged.) Persistent stat/affil riders on A Crisis / Cast Out remain approximated.
- **The Long Road** — now playable (HoT 10/turn on a Wandering/Faithless body).
- **Reagent Pouch** — draw wired + `tryDraw` AI heuristic (not in any deck currently).
