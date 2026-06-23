# Sigil — Next Steps

### v0.7 — Project-Wide Priorities and Open Work

This document tracks what's next for the Sigil project as a whole. Individual documents (Ruleset, Lore, card sets, Combat & Effects) hold their own open questions internally; this document captures the **cross-cutting work** that moves the project forward.

When something gets done, move it to the **Completed** section at the bottom rather than deleting it — the history of decisions is part of the game's memory.

-----

## Immediate Priorities

### 1. Reflect the locked Arlia roster into the Card Forge / CSV

The Arlia card set is now gospel as defined in the canonical spreadsheet, with the seven cards:

- **Arlia, Destined Trainee** (T1, Fire, 20/10/10) — Destined, Trainee
- **Mage Arlia** (T2, Fire, 30/40/10) — Mages Guild, Destined — *Unstable Resonance*
- **Squire Arlia** (T2, Earth, 50/20/20) — Kaethlaan Knights, Destined — *Me for You*
- **Arlia, Youngest Archmage** (T3 TERMINAL, Fire, 40/70/20) — Mages Guild, The Archive, Destined, Attuned — *Magical Shield*, chain *Consortium*
- **Captain Arlia of the Royal Army** (T3 TERMINAL, Earth, 70/40/50) — Kaethlaan Knights, Destined, King's Court (Kaethlaan) — *My Liege*, chain *Triangle Attack*
- **The Wandering Acolyte Arlia** (T3, Light, 50/40/20) — Destined, Wanderers — *Seeker*
- **The Ascended** (T4 TERMINAL, Dark & Light, dynamic stats) — Ascended, Wanderers, The Divine Channel — *Absolute Truth*, chain *The Channel*

Sheet-level cleanups locked in this session (apply when next editing the CSV / Forge):

- **Captain Arlia of the Royal Army TransformIn** → *Squire Arlia + 2 T2 Items* (was self-referential)
- **The Wondering Acolyte Arlia → The Wandering Acolyte Arlia** — spelling fix
- **The Ascended TransformIn** → *The Wandering Acolyte Arlia + 1+ T3 Items* (was 3+); minimum stat line therefore 20/20/20
- **Mage Arlia ability text (Unstable Resonance)** → *"When Mage Arlia enters play, deal 10 damage to each of your other Mages Guild characters. While she is in play, your Mages Guild characters have +10 ATK."* (entry trigger, one-time damage, ongoing ATK aura)
- **All instances of *Shadow* element** → *Dark* (none currently in the roster but flag for any future card text)
- **Royal Army not added as a separate affiliation** — kept as flavor in Captain Arlia's title only

### 2. Finish Kael's Love road

Kael's **Loyal, Outlaw, and Subordinate** roads are designed and in the CSV (v0.7 Kael session). The **Love road** is the one remaining branch, blocked on three un-built pieces:

- **Arlia, Kael's Wife** (Fire, Sworn, Destined) — TBD tier/stats/ability; she is half of the marriage pair.
- **Kael, Arlia's Husband** (T3 terminal, Sworn) and its dead-end exit **Mourning Widower, Kael** (T3 terminal, Forsaken; triggered when the wife dies) — TBD stats/ability.
- **A paired / marriage transformation rule** — no rule yet exists for two characters transforming together (Kael + Arlia → their married forms). Open questions: do both partners transform simultaneously; is it one transformation action or two; what if only one destination is in hand; and how does the widower exit trigger off the wife's death? The Subordinate road deliberately sidesteps this with a presence-gate (Arlia required but not consumed); the Love road needs the real mechanic.

Design these together in one pass.

### 3. Design the Plague ecology

Now unblocked by the v0.6 HP framework and (G) scope rule. Design the first set of field cards:

- **Plague** (world-state field card) — "Reduce all Max HP by 10" while in play; serves as upgrade trigger for fall-path characters
- **Medical Advancement** (Kaethlaan Kingdom field card) — "Increase your side's Max HP by 10" while in play
- **Plague Ritual** (cast event, not a field card) — requires a Dark T2 character in active zone; applies a Plague-equivalent effect to opponent only
- **Curse of Darkness** (world-state field card) — stronger Plague variant; "Reduce all Max HP by 20" while in play; not fully countered by Medical Advancement alone
- **Blessing of Light** (world-state field card) — divine act; "Increase all Max HP by 20" while in play for both sides

This is the **canonical demonstration of Mathematical Opposition** in action: none of these cards reference each other by name, but they form an interlocking ecology through numerical interaction.

*(Note: Plague and Medical Advancement are already written into the Events CSV as Persistent Events; the broader ecology above — Plague Ritual, Curse of Darkness, Blessing of Light — is still to design.)*

These card definitions go into the Card Forge / CSV when designed.

### 4. Define Attuned

The affiliation appears on *Arlia, Youngest Archmage* and is referenced in her chain ability *Consortium* alongside *Mages Guild*. It now also appears on the **Hresheeba line** (Touched Child / Old Maid Hresheeba), which makes resolving it more pressing. Its scope and meaning are unresolved:

- Is Attuned a sub-tag within Mages Guild (e.g., characters who have achieved magical resonance with the elements), or a cross-cutting state any character can enter? (The Hresheeba use leans cross-cutting — a touched seer, not a Guild mage.)
- Is its cultural scope Kingdom-internal (Kaethlaan only), cross-border, or universal?
- What gameplay-shape does it have beyond chain eligibility — does it confer auras, immunities, anything?

### 5. Design canonical sustained-by creatures

The v0.6 ruleset preserves the sustained-by category (0/0/0 monsters playable only when a sustaining Max HP source is in play). Design at least 2-3 examples to validate the mechanic:

- One that's playable with Wise Sage in play
- One that's playable with Blessing of Light in play
- One sustained by a character-emission (a Kael-bubble dependent, ironically)

These prove the mechanic works and provide deck-building anchors. Their definitions go into the Card Forge / CSV.

### 6. Design a creature card — **substantially done**

Validate the **unified tier ladder**. Now that the Beast/Tribal Creature distinction is dissolved, creatures are simply characters with shorter arcs.

- **One T1-terminal creature** (e.g., Thestral) — single form, no progression
- **One T2-terminal tribal creature** (e.g., Lor'oak Goblin Grunt → Lor'oak Goblin Commander) — base + one upgrade, with a printed chain ability on the Commander ("Rush — Chain 2 Goblin Active")

*Done and then some this session:* alongside Thestral and the Lor'oak line, the Characters CSV now holds a **generic Goblin ladder** (Goblin Soldier → Lieutenant → Captain, aura-only) and **12 single-form Wild monsters across all six elements**. The unified-ladder low layer is validated; cheap fast plays exist for every element. (See Completed.)

### 7. Mock a full game on paper — **now also have a simulator**

Pick a Leader candidate, build a 30-card deck, and play it through 5+ turns against a hypothetical opponent under the current ruleset. Track:

- What feels good
- What feels awkward
- What's broken (overpowered, underpowered, unclear)
- What rules questions emerge in play that aren't in the documents

This is the fastest way to find the next batch of problems. With Arlia, Kael (three roads), Honathan, the creature/event/item pool, the War family + wartime buffs, the commons, and the Divine Channel package in the CSVs, there is more than enough card content to assemble real decks and stress-test the rules.

*New this session:* a **rules-faithful simulator** (`sigil_sim.py`, in the Sigil Box folder) now plays thousands of games between archetype decks and reports win rates, game length, and how games end — a faster-than-paper stress test. It already surfaced real structural observations (chains are the pressure valve; the War deck's loss pattern). It needs a verification run of its faithful v2.1 engine before its numbers are trusted. See Completed for the findings and caveats.

-----

## Open Questions to Resolve (v0.8)

These remain from earlier versions plus new ones surfaced during recent sessions. Grouped by topic.

### Combat and timing

- **"At end of turn" vs "at start of turn" timing.** Both phrases appear on cards. Need a consistent ordering system — when do simultaneous effects resolve, what's the priority? Increasingly urgent now that HoTs, Max HP ticks, Wise Sage's entry-heal, and War attrition all coexist at the start of a turn.
- **Auto-Event resolution math.** For stat-weighted Fated Encounters, what's the default formula?
- **One-shot ATK/DEF buff duration.** No rule governs how long a one-shot stat buff lasts (until end of turn? end of next turn? permanent?). The three-part HP framework covers HP only. Shield Wall was made a Persistent Event to sidestep this; a general ruling is needed before one-shot combat-trick buffs can be printed.

### Game flow

- **Mulligan rules.** *Note: Ruleset Setup already specifies "5 cards, one free mulligan (full reshuffle, redraw 5)" — this is effectively answered and should be marked resolved on the next Ruleset/Next Steps reconciliation; the open-question phrasing is stale.*
- **Hand size limit.** Default 7? Any max?
- **Card draw beyond turn 1.** Fatigue mechanics? Burnout? Or just deck-out as the timer? (Ruleset currently uses deck-out as the timer. The simulator confirms deck-out lands around turn ~25–26 on a 30-card deck, so it is in practice the long-game clock — worth a deliberate decision about whether that's the intended feel.)

### Board state

- **Active/passive vulnerability principle.** Working idea floated in v0.4 session: active = vulnerable, passive = protected. Cross-cutting rule affecting equipment, field cards, persistent events. Would enable "Hand of God" style removal cards that target active non-character cards. Needs its own design pass — touches the entire active/passive economy. (The War family already leans on this: War/Holy War/Goblin War damage only the active zone, sheltering the passive zone.)
- **Persistent event slot competition.** Can both players play persistent events into the *same* passive zones, or only their own? (Working assumption: only your own. Field cards follow this rule but produce shared effects.)
- **Persistent-event removal.** Persistent events "remain until removed," but the removal vocabulary is underspecified (the active/passive "Hand of God" idea above is the floated mechanism). The War family currently sidesteps this with a self-removing coin-flip burnout; a general rule is still wanted.
- **Equipment as a combat target.** *Resolved (v0.7):* equipment and items can be targeted and destroyed directly by effects (see Completed). *Still open:* whether non-character cards also carry their own HP/DEF and can be *attacked* in the combat phase, or are only ever removed by effects. Working model is effect-removal only.
- **Disgrace pile interaction.** Several cards reference it. Define visibility (public? hidden?) and ordering rules.

### Card categories needing development

- **Status immunity formalization.** The Forsaken's "cannot be targeted by friendly abilities, healing, or transformations" needs to slot into the v0.6 effects framework. Probably: "she's immune to all effects of [category]." Confirm.
- **Counter-card ecology examples.** Plague ↔ Medical Advancement is the canonical Mathematical Opposition example. Need similar canonical examples for other effect categories (status removal, character protection, transformation prevention).
- **Chain-breaking field cards.** Fog of War as canonical example. Define the full design space — how chains can be disrupted, prevented, redirected.
- **Formalize the War keyword.** The War-family cards (War, Holy War, Goblin War) carry a **War** descriptor in their type line, and *Taken Prisoner* / the wartime buffs / *The Broken March* reference "while a War is in play." Add this keyword to the Ruleset glossary on the next Ruleset pass so the reference is canonical. (Also define what counts as a "War effect" for *Hardened Veterans*-style immunity.)
- **Event / item tier function.** *Item* tier is mechanically real — it is transformation fuel (higher transforms demand higher-tier items; The Ascended's stats = items discarded × 20). *Event* tier currently does nothing mechanically; it is a pure power/complexity label (no mana, no curve, nothing gates events by tier). Decide whether event tier should gate or cost anything, or stays a label. (Surfaced when sizing War T2 vs Holy War T3 — the difference had to be printed in text, not carried by the tier.)

### Divine Channel package

- **The Ascended's ARRIVAL speed.** This session's Channel Being + Old Maid Hresheeba fix *assembly* — having enough Divine Channel bodies to fire The Channel. They do **not** fix *arrival* — The Ascended still has to climb the long Arlia chain (Trainee → Mage → Wandering Acolyte → Ascended), so it tends to arrive too late to matter. Decide: add an arrival-accelerator (e.g., a Hresheeba clause making Wandering → Ascended cost one fewer item), or accept The Channel as a rare win-more. An arrival clause was offered this session and deferred.

### Hybrid element edge cases

- **Light vs Dark & Light.** Light deals +10 against Dark. Does that bonus apply against a Dark & Light hybrid? (Working assumption: yes, because the hybrid contains Dark.) *Note the inverse just got a card-level ruling: under Holy War, a Dark & Light hybrid is treated as Light (spared), because the relevant clause keys on "element includes Light." The two are not in tension — matchup amplification and Holy War's alignment clause are different mechanics — but worth reconciling if a general hybrid rule is written.*
- **Dark's DEF-ignore vs Dark & Light defender.** Symmetric question. *(The simulator implements the base rule faithfully: Dark ignores only the FIRST DEF check per turn against a Light target.)*
- **Hybrid attacker vs hybrid defender.** Light & Dark attacking Light & Dark — full mutual amplification, or none? Needs an explicit rule.

### Affiliation specifics

- **Attuned scope and meaning.** Tracked above in Immediate Priorities #4; now appears on both Arlia (Youngest Archmage) and the Hresheeba line, so it wants a ruling.
- **War-Torn and Mercenary.**
  - **War-Torn** is a **state — a War-Torn character cannot attack** — treated as a Universal state any soldier can enter. It is now conferred by **two** sources: *Taken Prisoner* (deliberate, gates Kael's outlaw road) and **Holy War**'s on-entry coin-flip capture (incidental hazard; does **not** gate the outlaw road). The earlier "only Taken Prisoner confers it" framing is superseded. **Attack-through-War-Torn now exists as a character ability, not just an equip:** Illyego's *War Child* and A Man Bred for War's *Forged in Chains* (which also *buffs* while War-Torn), alongside the *Unbroken Will* equip. And **The Broken March** turns a wide War-Torn board into a finisher (War-Torn swarm chain). So War-Torn has flipped from pure cost to a build-around payoff.
  - **The Broken March consistency (open).** It needs **2+ War-Torn** characters to fire its chain, but the capture sources are slow (Taken Prisoner one at a time; Holy War a single coin flip). Confirm via simulation that the finisher comes online early enough, or add capture velocity.
  - **Mercenary** scope/meaning is still **TBD**, but it now has real users — *A Man Bred for War*, *Illyego, the Soldier*, and *Kael the Killer* — so a definition is overdue. Note the deliberate choice that *Illyego, the Conqueror* is **Faithless, not Mercenary** (a self-made warlord, not a hireling).

### Simulation / tooling

- **Run and verify the faithful simulator.** `sigil_sim.py` (Box) was rebuilt to v2.1 against Ruleset v0.7 + Combat & Effects v0.3, but was **not executed in the session it was written** (no code-execution environment that turn). Next: run it, fix any remaining bug, and **re-derive observations from the faithful engine** — the older win-rate numbers came from a pre-correction model (it mistakenly folded elemental amplification in *before* the DEF block, which over-produced kills) and should not be trusted. Then add an **equipment-effect verification run** so the durability question (do the new defensive items actually keep the War deck's bodies alive against chains?) can be answered, plus a clean coherent-outlaw-War list vs the field.

-----

## Medium-Term Work

### Expand Kaethlaan's roster

Beyond Arlia, Honathan, and Kael, Kaethlaan needs:

- **A Mages Guild character who isn't Arlia** — shows the Guild from a different angle (a senior mage, a rival prodigy, a teacher)
- **A Kaethlaan Knight character who isn't Arlia** — same, for the Knights (a veteran captain, a rival squire, a knight-commander)
- **A villain or antagonist** — gives us our first real opposition; possibly a fallen ex-Kaethlaani, possibly an outsider
- **A supporting character with a non-Arlia shape** — e.g., a healer with only sidegrades (no upgrades, no falls), to test that the schema handles minimal-progression characters well
- **A T2 or T3 terminal character** — demonstrates the variable-tier-terminal concept in practice; not every Kaethlaani character peaks at T4 *(several now exist: Second in Command Kael, the Kael outlaw/loyal terminals, Goblin Captain, Old Maid Hresheeba, A Man Bred for War — the concept is well-validated.)*
- **Another character with King's Court (Kaethlaan) membership** — proves the affiliation has multiple homes *(The King's Blade now also carries it.)*

Each gets its own card-set entry in the Card Forge / CSV.

### Expand the field card library

With field cards established as a category and the Plague ecology unblocked:

- **More world-state field cards** — natural disasters, divine acts, cosmic events (Famine, Eclipse, Awakening, Harvest)
- **More Kingdom-scope field cards for Kaethlaan** — the kingdom's signature institutional investments (Royal Decree, Coronation, Festival, Knight Training Programs)
- **Field cards for other elemental traditions** — what does a world-state Dark card look like? What does a Light Kingdom-card look like?

### Define the visual identity

- Card frame design (per kingdom? per element? per card category?)
- Color treatments for Light vs Dark (especially for characters who shift mid-arc)
- Visual treatment for hybrid elements (Dark & Light)
- Affiliation iconography
- Element iconography
- TERMINAL tag visual treatment
- Field card visual treatment (world-state vs Kingdom-scope)
- Chain ability visual treatment (a "chain" iconography distinguishing chain-eligible characters)
- (G) suffix visual treatment in card text — does it render inline, as a small badge, etc.?

### Define new event cards

- More Light-side events (currently Final Vow is the only one — needs companions)
- More universal events for use across kingdoms
- Persistent-variant counterparts for existing one-shot events
- **Disillusioned** and **Opportunity** — the two events that gate the Mage Arlia → Wandering Acolyte upgrade. *(Now built and in the Events CSV, alongside A Crisis of Faith, Cast Out, and The Long Road.)*
- **War events ecology (anchor cards + variant + buffs + finisher locked; balance pending playtest).** A family of world-state Persistent Events carrying the **War** keyword, each enacting global attrition. **War** (T2) and **Holy War** (T3, Light) are written to the Events CSV: each turn, deal damage to all characters in an active zone on both sides (Leaders exempt, since the Leader slot is neither active nor passive); both self-remove via a coin-flip burnout (**War** flips from turn 2; **Holy War** holds longer, flipping from turn 4). **Holy War is morally targeted** — any character whose element includes Light (Dark & Light hybrids included) takes 0, pure-Dark takes 20, all others take 10 — and it now also **captures** on entry via a coin flip (heads → that player makes one of their own characters War-Torn). The affiliation-scoped **Goblin War** (T2) is also written — it damages only non-Goblin active-zone characters, so the goblin horde marches through unharmed. Capture lives on **Taken Prisoner** (deliberate, gates Kael's outlaw road) and on **Holy War** (incidental coin flip; does not gate the outlaw road); base War and Goblin War do not capture. *(This supersedes the earlier "capture lives only on Taken Prisoner" framing.)* The wartime-buff set (items *Warmonger's Resolve, Unbroken Will, Goblin War-Banner, Sanctified Blade*; persistent events *Crusade, Horde Frenzy, Hardened Veterans, Rally to War*) is in the CSVs, balance deliberately loose for simulation. **The Broken March** (T3 Persistent Event) is the archetype's **finisher** — a War-Torn swarm chain — and an **attack-through-War-Torn character** now exists (Illyego's *War Child*, A Man Bred for War's *Forged in Chains*), closing both of the previously-listed "still to do" items. Remaining: tune all War-family numbers via simulated matches.

-----

## Long-Term Roadmap

### The remaining five kingdoms

Each future set expands the game into one new kingdom. Working list of slots:

- **Kingdom 2** — TBD (a contrasting kingdom; possibly one with a darker magical tradition, or one in conflict with Kaethlaan)
- **Kingdom 3** — TBD
- **Kingdom 4** — TBD
- **Kingdom 5** — TBD
- **Kingdom 6** — TBD

Each kingdom needs its own lore doc following the Kaethlaan template, plus its own character roster, institutions, signature mechanics, and field card style.

### Cross-kingdom alternate characters

Once a second kingdom is designed, prototype Arlia's alternate version there. Same soul, different homeland, different stats and affiliations.

### Cross-border affiliations

As kingdoms are added, identify which affiliations span multiple kingdoms (The Standard-Bearers is a current candidate). Define how cross-border affiliations work mechanically.

### Universal characters

Some characters might not belong to any kingdom at all — exiles, wanderers, entities that predate the kingdom system. Reserved design space for later.

-----

## Completed

*(Items moved here as they're done, with rough date stamps. The full session-by-session changelog is preserved in the canonical Box copy of Next Steps v0.7; this repo mirror keeps the priorities and open questions that drive the simulator. See Box for the complete Completed history.)*

### v0.7 session highlights (see Box doc for full detail)

- Expanded the common creature pool (Illyego line, generic Goblin ladder, 12 Wild monsters).
- Holy War now captures on entry (coin-flip War-Torn).
- Divine Channel package can assemble The Channel (Hresheeba line + Channel Being).
- War-Torn turned from cost into payoff (A Man Bred for War, The Broken March).
- Ten new items with downsides on the heavy pieces.
- Built the rules-faithful simulator (`sigil_sim.py`, v2.1) — findings: chains are the pressure valve; War deck loses to no burst finisher + fragile bodies + incoherent list. Engine untested in-session; numbers need a verification run.

-----

*This document is the project's spine. Everything else hangs off it. Keep it short, keep it current, and move things to Completed when they're done.*
