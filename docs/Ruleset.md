# Sigil

### v0.7 — Designer's Notebook

A trading card game of armies, bonds, and inevitable fates.

-----

## The Pitch

Lead an army through a story. Build your kingdom in a two-turn opening phase where no blood is shed, then elevate one of your characters to Leader — the commander whose loss ends the war. Equip Trainees into Mages. Evolve Hopefuls into Jaded veterans through tragedy. Watch characters branch into Tormented or Sworn forms based on who lives, who dies, and what events befall them. Chain attacks through shared affiliations. Amplify them with elemental power. Lay down world-state cards in the passive zone — plagues, blessings, prophecies — that twist every transformation that follows.

Every deck tells a different war. The world has **six kingdoms**, each its own set; the first is **the Kingdom of Kaethlaan**.

-----

## Core Identity

Sigil is built on eight interlocking ideas:

1. **Slot economy** — no mana, no resource ramp; your board space *is* your economy
1. **Printed-form transformation** — characters have multiple printed forms; transformations swap one printed card for another
1. **Active/Passive board structure** — a passive zone holds characters, equipment, and persistent world-state cards, alongside the front-line active zone
1. **MOBA-style early game** — no combat turns 1-2; armies must be built before they fight, and Leaders emerge from the opening rather than being declared at deck-build time
1. **Narrative event cards** — events are story beats (Tragedy, Coronation, Betrayal) that trigger character arcs
1. **Element + Affiliation synergies** — Element amplifies damage; Affiliation enables chain attacks and abilities
1. **Leader-as-win-condition** — defeat the opposing Leader to win the war
1. **Mathematical Opposition** — cards never directly counter other cards by name; opposition emerges from numerical and conceptual interactions

-----

## Setup

- **Deck:** 30 cards
- **Starting hand:** 5 cards, one free mulligan (full reshuffle, redraw 5)
- **Board:** 3 active slots + 3 passive slots + 1 Leader slot per side (7 total, though the Leader slot stands apart from the active/passive economy)
- **No Leader at game start.** You do not declare your Leader before the game begins. Your Leader is elevated from your active or passive zone during the opening phase — see Leader System below.
- **Draw:** 1 card per turn. Some cards grant additional draws. Empty board (zero cards in active + passive) at the start of your turn = instant 2-card draw.

-----

## Turn Structure

Each turn proceeds in this order:

1. **Draw phase** — draw 1 card (plus any bonuses)
1. **Main phase** — play any number of cards from hand into legal slots; perform transformation actions; activate abilities
1. **Combat phase** — declare attacks (only from turn 3 onward)
1. **End phase** — resolve end-of-turn effects, Auto-Events check, Leader elevation (if end of your turn 2), pass turn

**Cards per turn:** Unlimited, constrained only by hand size and available slots.

**Transformation action:** One per turn, per player. You may either upgrade *or* sidegrade *or* downgrade in a given turn. Cards that trigger transformations independently (events, abilities, banked-kill thresholds) still resolve at the one-per-turn cap unless a card explicitly grants extra transformation actions.

-----

## Slot Economy

Slots are everything. You have 6 standard slots (3 active + 3 passive) plus 1 dedicated Leader slot. Every card that enters play occupies one of the standard slots; the Leader slot is reserved for your designated Leader and does not compete with your army's board space.

There is no mana, no resource ramp, no curve — only space and commitment.

### Default slot behaviors

- **Characters** default to entering the **active zone, exposed**. They may move to passive on a subsequent turn via their transformation action *or* via their own card text.
- **Equipment** defaults to entering the **active zone** to charge/prove itself, then moves to passive on a subsequent turn. Once in passive, it links to a character.
- **Events** default to resolving from the hand as one-shots, OR may be printed as persistent events that occupy a passive slot.
- **Field cards** default to entering the **passive zone** and remain in play until removed.

> **Design principle:** No card type implicitly does anything. The above are *defaults*. Every card may override its default with its own text.

### Slot full?

Slots are a hard cap. When all slots in a zone are full, you cannot play new cards into that zone. You may voluntarily **retire** a card to free its slot — but a retired card becomes **Disgraced** and can never return to play.

### Equipment slot rule (Transcendence)

Equipment occupies a passive slot for as long as the character *needs* it. When a character upgrades to a form that no longer requires the equipment (a "transcendent" form), the equipment may be discarded freely and the slot opens up. This makes powerful intermediate forms *expensive* (multiple slots committed) and transcendent forms *efficient*.

-----

## Leader System

The Leader is your designated commander. Losing them ends the war. The Leader system is the heart of Sigil's narrative engine — each game's Leader is determined by who you can summon and crown during the opening phase, so every game tells a different story.

### Elevation

You do not declare your Leader at deck-build time. Instead:

1. **Turns 1-2** are an opening setup phase. No combat occurs (already a rule). You may play cards normally — characters, equipment, events, field cards — to build your opening position.
1. **At end of your turn 2**, you must elevate one of your characters to Leader. The elevated character must have been in play (active or passive zone) for at least one full turn — meaning, characters played on turn 1 are eligible at end of turn 2, but characters played on turn 2 are not yet eligible. (This makes turn 1 a real commitment: who is my Leader candidate?)
1. **The elevated character moves into the Leader slot.** Their previous slot (active or passive) opens up.
1. **Elevation is one-shot.** Once elevated, you cannot swap Leaders.

If both players elevate by end of turn 2, combat opens normally on turn 3.

### Going first vs going second

Each player elevates at the end of their *own* turn 2. The player going first gets tempo advantage (their turn 3 — first combat-eligible turn — comes before the second player's turn 3). The player going second gets information advantage (they see the opposing Leader before choosing their own). This is the standard TCG asymmetry.

### Leaderless penalty

If you have no eligible character to elevate at end of turn 2, your army enters a **Leaderless lockout**:

- **No character on your side may transform.** All upgrades, sidegrades, and downgrades are frozen, for every character you control, until you elevate a Leader. Kills still bank toward future transformation thresholds, but cannot be cashed in.
- **You may continue to play cards normally** — summon, defend, take hits — but your army cannot grow or change form.
- The lockout lifts the instant you elevate.

If you have still not elevated a Leader **by the end of turn 6**, you lose the game.

### The Leader slot

The Leader slot stands apart from the 6 standard slots. Its mechanics:

- **The Leader may attack** like any character, from the Leader slot.
- **The Leader can only be attacked when your active zone is empty.** As long as you have any character or creature in active, the Leader is untargetable. (Specific character cards may override this rule — see "Character-specific Leader rules" below.)
- **The Leader may participate in chain attacks** initiated by other characters of their affiliation, normally. The Leader's tier bonus applies to their contributed ATK.
- **The Leader slot follows the soul, not the form.** When the Leader transforms (upgrades, falls), they remain in the Leader slot through every form change.

### Leader tier bonus

The Leader receives a stat bonus based on their current tier, applied to all stats (HP, ATK, DEF):

|Tier     |Bonus      |
|---------|-----------|
|T1       |+10 (floor)|
|T2       |+30        |
|T3       |+50        |
|T4       |+70        |

The bonus updates dynamically. If your T2 Leader upgrades to T3, their bonus jumps from +30 to +50 immediately. If they fall to a T1-rated fall form, their bonus drops to +10. The bonus is tied to the Leader's *current* tier, not their peak tier.

This makes elevating a high-tier character a powerful late-game commitment, while elevating early gets you a smaller bonus but a Leader from turn 3 onward.

### Leader transformation restrictions

Leaders are not free to transform along all paths:

- **Leaders may upgrade.** Climbing the tier ladder is encouraged and rewarded by the tier bonus.
- **Leaders may not downgrade.** Once a Leader reaches a tier, they cannot be event-knocked back down the main progression.
- **Leaders may sidegrade only at T1 or T2.** (This follows from the general sidegrade rule — see Transformation System.) Sidegrades at T3 or higher require downgrade-then-upgrade, which Leaders cannot do.
- **Leaders may fall.** Falls are sideways transformations onto the dark path, not downgrades on the main ladder, so they remain available. A fallen Leader stays in the Leader slot, and their bonus updates to whatever tier the fall form is rated at.

### Character-specific Leader rules

Individual character cards may print specific Leader behaviors in their text. These override the general Leader-slot rules. For example, a card might say "Leader rule: Always attackable" — meaning even if your active zone has other characters, this Leader can still be targeted. Such rules are part of the character's design identity and create deck archetypes (an "always exposed" Leader plays very differently from a "protected" Leader).

-----

## Combat

### Stat scale

All HP / ATK / DEF values are scaled in multiples of 10. Typical ranges:

- **HP:** 20-100 (Leaders effectively higher due to tier bonus)
- **ATK:** 10-60
- **DEF:** 0-40

### Damage resolution

When a character attacks:

1. Attacker declares target (only active opposing characters by default; the opposing Leader only if their active zone is empty)
1. Compare attacker's ATK to defender's DEF
1. If ATK ≤ DEF: the attack is blocked — no HP damage dealt
1. If ATK > DEF: damage = (ATK - DEF), subtracted from defender's HP
1. Elemental modifiers apply after base damage (see Elements)
1. HP persists between turns
1. HP reaches 0 → character is KO'd → moves to discard pile (not Disgraced)

### What else can attacks do?

A blocked attack still happens — and some attacks have secondary effects that fire regardless of whether damage was dealt. Effects can include: applying status conditions, forcing a position swap, draining resources, triggering events. The card text defines what an attack does beyond damage.

### Chain attacks

Chain attacks are coordinated multi-character attacks initiated by a printed chain ability. They are summarized here; see **Combat_and_Effects.md** for the full reference.

Key points:

- A character can only initiate a chain if they have a printed chain ability ("Press the Attack — Chain 2 Kaethlaan Knights — Damage equals sum of attacks vs target's DEF").
- Chain abilities print: name, chain size, affiliation requirement, optional zone restriction, damage formula, costs.
- The initiator's element is the chain's element. Elemental amplification applies per-participant.
- KO credit goes to the initiator; damage contribution counts toward every participant's banked kills.
- A character spends their attack once per turn — solo or as a chain participant.
- Multiple chains may occur per turn, subject to no character participating twice.
- Participants may be active or passive by default; chains can restrict to active-only via card text.
- If any participant is removed before resolution, the chain fizzles.
- Chains can exist at any tier — two T1 creatures can chain if one has a printed chain ability.

### HP framework

Sigil has three distinct categories of HP-affecting effects. They are summarized here; see **Combat_and_Effects.md** for the full reference.

- **Damage** — instant, irreversible reduction of current HP. Persists when source removed.
- **Heal** — instant restoration of damage taken. Persists when source removed. Capped at current Max HP unless the card explicitly grants overheal.
- **Max HP modifier** — a buff or debuff to the HP ceiling. Tied to source; reverses when source removed. Follows the **cap-only rule**: current HP only follows the ceiling if it would exceed it.

By default, a card's effect happens once when it enters play and persists while the card is in play. Per-turn ticks require explicit card text. Permanent (source-detached) effects also require explicit text.

### Entry rule

When a character enters play, they enter at **full base Max HP**, then any active bonuses apply. For most characters this means entering at their printed HP value with any active Max HP buffs adding to the ceiling. For sustained-by characters (0/0/0 monsters), this is what enables them to enter alive when an active buff is sustaining them.

### Effects framework

Sigil has no separate "status system." There are simply **effects produced by sources** — field cards, character abilities, persistent events, equipment. Each effect is defined per-card. Tracking is implicit (no tokens); the effect exists while its source is in play. Cards that interact with effects in bulk reach for categorical descriptors (element, mechanism, source type), not specific card names.

See **Combat_and_Effects.md** for the full treatment.

### Early game lockout

No combat is permitted on turns 1 or 2. Both players use these turns to build their armies, position their Leader candidates, and prepare. Combat begins on each player's turn 3.

### Kill credit

When a character is KO'd, the attacking character is credited with a kill for transformation triggers.

- **Direct attacks:** the attacking character earns the kill.
- **Chain attacks:** the initiator earns the kill. Damage contribution from other participants counts toward their banked-damage totals for transformation thresholds based on damage dealt, but only the initiator earns the KO credit.
- **Ability damage:** the character whose ability dealt the KO-ing damage earns the kill.
- **Indirect/environmental KOs** (a character KO'd by Plague damage, by a Massacre event, or as a side effect of an ally action) do not credit any character with a kill.
- **Kills persist through transformations.** A character's accumulated kill count follows them across every transformation, including upgrades, sidegrades, downgrades, and falls. Kills are part of the character's identity.

-----

## Transformation System

Characters have multiple printed forms. Transformation swaps one printed card for another based on conditions.

### Transformation types

- **Upgrade:** Move to a stronger/later form (e.g., Trainee → Mage). Characters may have multiple upgrade branches off the same form (e.g., Mage Arlia branches into Arlia, Youngest Archmage *or* The Wandering Acolyte Arlia, depending on which transformation conditions are met).
- **Sidegrade:** Move to a parallel form at the same power tier (e.g., Mage → Knight at T1 or T2)
- **Downgrade:** Move to an earlier/weaker form (e.g., Mage → Trainee)
- **Event transformation:** Triggered by event cards independent of the player's transformation action
- **Presence transformation:** Triggered automatically by the presence (or loss) of specific other characters
- **Fall:** A transformation onto the dark path (a parallel ladder of fallen forms). Falls have their own tier ratings independent of the main progression's tier — see "Fall tiers" below. Not every character has fall forms; characters whose dark-element trajectory is dramatized as a chosen path rather than breakage may handle that path as an upgrade branch instead.

### Transformation rules

- **One transformation action per turn, per player.** This includes transformations triggered by banked kills crossing thresholds — those still count against your one-per-turn cap unless a card explicitly says otherwise.
- **Sidegrades at T1 or T2 are direct, single-action transformations.** A T1 Mage may transform to T1 Knight in one action, consuming that turn's transformation action.
- **Sidegrades at T3 or higher** still require downgrade-then-upgrade across multiple turns. (Card text may override.)
- **Transformation paths are printed on the destination card**, not the origin.
- **The destination form must be in your hand.** A transformation swaps the in-play origin card for its destination form, and that destination card must be in your hand at the moment you transform. A character cannot advance to (or fall to, or sidegrade into) a form you have not drawn or otherwise put into your hand. This makes finding your later forms part of the puzzle — and makes deck-search effects (see Card Design Philosophy) meaningfully valuable. Printed transformation costs (consumed items, attached events, banked kills) are still paid as written.

### Fall trigger specificity

When a character's fall trigger references an effect, it names the specific card or condition. "Falls while Plague is in play" is the canonical form. A future Plague-equivalent card would not automatically satisfy this trigger unless its own text explicitly references Plague-equivalence. This is a deliberate constraint — each fall trigger is crisp at print time, and future cards may opt into existing fall ecosystems explicitly.

### Variable-tier terminals

Not every character's progression goes the same distance. Some characters end their arc at T2; others at T3; the most developed (like Arlia) reach T4. The tier at which a character's main progression ends is called their **terminal tier**. Each character is designed with their own terminal tier:

- **T1 terminals:** Single-card characters with no transformation. Most beasts and minor creatures.
- **T2 terminals:** Two-card characters. Minor named characters, tribal creatures with one upgrade.
- **T3 terminals:** Three-card characters. Supporting characters whose arc resolves in adulthood.
- **T4 terminals:** Four-card characters. Major characters whose full apex requires the entire game.

Terminal forms are flagged with a "TERMINAL" tag on the card for clarity. A character may have multiple terminal forms across different branches — Arlia, for example, has three distinct T3+ terminals (Arlia, Youngest Archmage at T3; Captain Arlia of the Royal Army at T3; The Ascended at T4) reachable through different upgrade paths.

### Fall tiers

Fall forms have their own tier ratings, designed per-character. A character's first fall form might be T1-rated; their terminal fall might be T3- or T4-rated. The structure is flexible per-character.

### Character identity

Each named character is unique on your board. You cannot have two Arlias in play simultaneously, regardless of form.

### Unified ladder for all characters

All entities in Sigil — Kingdom characters, beasts, tribal creatures, and everything in between — exist on the same tier ladder. Any character — including a goblin commander — can theoretically be designated as a Leader, with the corresponding tier-bonus implications. Niche decks are a feature, not a bug.

### Metamorphosis (v0.8 amendment)

A one-shot **Metamorphosis** event transforms a T1 Wild you control into **any** T2 Wild in your hand — an *any-to-any* morph with no fixed lineage (the destination is not printed as a transform-in). It does **not** use your transformation action, keeps the body's banked kills, and the body's element becomes the new form's. This is how the Wild archetype reaches its six T2 terminals (Embermaw, Craghide, Skirrl, Tidewretch, Hollowed Stag, Gravecreep).

### Fusion — the Apex mechanic (v0.8 amendment)

Fusion is a transformation-adjacent mechanic for the **go-wide** archetypes (Wild's *Primal Fusion*; Goblin's *Pile On*). A Fusion event merges two creatures of its affiliation that you control into one growing predator — the **Apex**:

- **Merge.** One chosen creature becomes the Apex and absorbs the other, gaining its base ATK and HP (a glass cannon — it does **not** gain the absorbed creature's DEF) and its banked kills. The absorbed creature, and any equipment on it, leaves play. The Apex keeps its own form and tier, so a fused T1 Wild can still Metamorphose afterward.
- **Chainable.** The Apex tracks its **fusion count** — how many creatures it has absorbed. Feed the same Apex with more Fusion cards to grow it.
- **Escalation.** An Apex that has absorbed **2 or more** may attack the passive zone (reach); **3 or more** may attack the opposing Leader directly, ignoring zone restrictions.
- **Element effect.** Each fusion also triggers an effect keyed to the **absorbed** creature's element — Fire (damage an enemy), Water (the Apex heals), Earth (the Apex gains DEF, permanently), Wind (gain ATK), Light (heal an ally), Dark (damage the opposing Leader). Hybrid elements fire both components. (See the card text for exact values.)
- **Cost & timing.** Fusion does **not** use your transformation action; each printed Fusion card costs a card **discard** to fire. This is a deliberately card-hungry combo loop, fed by cheap, weak go-wide bodies and card-draw cantrips.

### The Ascended — item consumption (v0.8 clarification)

The Ascended's printed ability sets its HP/ATK/DEF to **(items discarded during transformation) × 20**, of **any tier**. The transform-in requires *at least one T3 item* only as an **entry gate** — when it transforms, **every** item in your hand (any tier) is consumed and counted. Stat-modifying riders on the consumed items do not apply (you trade them for the ×20); ability-grant riders still apply.

-----

## Synergies

### Element

Every character and most cards have an Element. There are six elements in the Sigil world: **Fire, Water, Earth, Wind, Light, Dark.** Elements are nature itself — they exist everywhere, in every kingdom.

A character may print a **hybrid element** (e.g., *Dark & Light*) — they belong to both elements simultaneously. Hybrid elements amplify against opponents weak to either component element, and take amplified damage from anything that beats either component element. The card text resolves edge cases where this matters.

#### Elemental matchups

The four physical elements form a rock-paper-scissors cycle:

**Fire > Earth > Wind > Water > Fire**

- Fire deals +10 damage against Earth on attack
- Earth deals +10 damage against Wind on attack
- Wind deals +10 damage against Water on attack
- Water deals +10 damage against Fire on attack

Light and Dark are neutral to the four physical elements. They interact only with each other:

- Light deals +10 damage to Dark on attack
- Dark ignores the first DEF check per turn against Light targets

#### Light and Dark — the cosmological pair

Light and Dark are unique: they are both elements (studied at magical institutions) and trajectories (cosmological states a character can fall into).

- A character whose printed Element is Dark may have arrived through the **studied door** (they learned Dark magic) or the **suffered door** (they were once Light, and the world broke them into Dark).
- Falls from Light to Dark forms are the canonical suffered-door path. Some characters also reach Dark through chosen upgrade branches rather than falls — same trajectory, different framing.

This double meaning is central to Sigil's identity.

### Affiliation

Characters belong to one or more Affiliations. Affiliations live in card metadata, not on the card face. Affiliations enable Chain Attacks, Affiliation abilities, and Leader-affiliation interactions.

#### Affiliation cultural scope

1. **Kingdom-internal** — bodies that exist only within one kingdom (e.g., The Kaethlaan Knights, The Mages Guild, King's Court (Kaethlaan))
1. **Cross-border / regional** — bodies that span multiple kingdoms but not the whole world
1. **Universal** — affiliations that transcend the kingdom system entirely. States of being rather than memberships: The Forsaken, The Returned, The Faithless, The Ascended, The Divine Channel. Any character in any kingdom can enter a Universal affiliation through fall, death, transcendence, or breakage.

Universal affiliations provide the shared cosmological floor across all six kingdoms.

#### Affiliation mechanical scope — the (G) suffix

When a card text references an affiliation (e.g., *"each Mages Guild character gains +10 ATK"*), the reference defaults to **characters under the controller's side only.** To reach across the table and include opponent characters of the same affiliation, the card must mark the reference with a **(G) suffix** on the affiliation name:

- `"each Mages Guild character takes 10 damage"` → only **your** Mages Guild characters
- `"each Mages Guild (G) character takes 10 damage"` → both **your and your opponent's** Mages Guild characters

This default reinforces Mathematical Opposition — cards make positive statements about their controller's army by default, and opt in to cross-side reach deliberately. The (G) suffix is a print-time choice on each card's individual text, not a property of the affiliation itself; the same affiliation may be referenced side-locally on one card and globally on another.

-----

## Card Categories

Sigil cards fall into these categories. Each has default behaviors that the card may override.

### Characters

Beings with HP/ATK/DEF that occupy slots and may attack, transform, and bear equipment. Includes everything from Kingdom heroes to wild beasts to tribal creatures, on a unified tier ladder.

### Equipment

Items that link to characters and modify their behavior. Defaults to entering active zone to charge before moving to passive.

Equipment and items can be **targeted and destroyed directly** by card effects that say so — they do not have to be removed via their bearer or through retirement. When a piece of equipment (or any effect-source card) is destroyed, every effect it was granting ends immediately, per the effects framework (see Combat_and_Effects.md). Cards that grant protection from destruction (e.g., a negate-and-destroy shield) interact with this directly.

### Events

Cards that resolve effects, in two flavors:

- **One-shot events:** play from hand, resolve immediately, discard
- **Persistent events:** play into a passive slot, remain until removed

### Field cards

Cards that play into the passive zone and alter the world-state. They split into two scopes:

- **World-state field cards** (e.g., Plague, Blessing of Light): cosmic in scope, affect both sides of the board. Either player may benefit from or suffer from a world-state card regardless of who played it.
- **Kingdom field cards** (e.g., Medical Advancement): your kingdom's investment, affects only your side. The opponent cannot benefit from your kingdom cards.

**Field card stacking:** Multiple field cards can be in play simultaneously, subject to slot economy. Two players playing the same field card (e.g., both playing Plague) results in the effects stacking — same field card double-applied. Mirror field-card matches become extreme by design.

**Field card removal:** Field cards can be removed by events or rendered ineffective by other cards through Mathematical Opposition. There are no cards that directly target field cards by name.

### Sustained-by creatures

A specialized character category. Sustained-by creatures have degenerate base stat lines (e.g., 0/0/0) that prevent them from being playable without an active Max HP-modifying source raising their HP above 0. They reward circular deck constructions where multiple cards reinforce each other; they are vulnerable to the source's removal. See **Combat_and_Effects.md** for details.

-----

## Card Design Philosophy

Sigil follows several design principles that distinguish it from other TCGs.

### Mathematical Opposition

**No card directly counters another card by name.** Cards are designed as standalone positive statements about the world. When two cards happen to oppose each other, the opposition emerges from numerical or conceptual interaction, never from explicit anti-counter wording.

**Example:** Plague and Medical Advancement. Plague is a Dark world-state field card that reduces all Max HP by 10. Medical Advancement is a Kaethlaan Kingdom field card that increases your side's Max HP by 10. Neither card mentions the other. When both are in play, the math cancels and your characters' Max HP returns to base — but the cancellation is emergent, not designed-in. Plague still serves as a transformation trigger for fall-path characters; Medical Advancement does not nullify that role, only the Max HP math.

This principle has several consequences:

- **No "destroy target spell" cards, no Magic-style counterspells, no Yu-Gi-Oh-style trap negation.**
- **Cards are always useful on their own.** A card that exists purely to counter another card is forbidden design.
- **The metagame is ecology, not arms-race.** Strategy emerges from how cards' effects interlock and oppose, not from running dedicated anti-decks.

### Default behaviors and explicit overrides

Sigil makes heavy use of default behaviors that individual cards may override. Examples: characters default to entering active; equipment defaults to charging in active before moving to passive; cards' effects default to one-time-on-play (not per-turn); ongoing effects default to tied-to-source (not permanent); affiliation references default to controller-side (not global). Any card may print explicit text to override its defaults. This keeps the ruleset compact while preserving design flexibility.

### Layered effects

A card may have multiple effects working in parallel. A character emits an aura while also being a combatant. A field card affects everyone while also serving as a transformation trigger for certain character types. An event card both removes a status and grants a buff.

When designing a card that needs to "feel different" from a similar card, use multiple axes rather than naming counters:

1. **Math** — different numerical values create different relationships with potential cures or amplifiers
1. **Play conditions** — what's required to play the card (character types in play, prior events, resources)
1. **Removal vocabulary** — what categories of cards can interact with this card (status removal, divine intervention, healing, etc.)
1. **Layered side effects** — additional behaviors beyond the primary effect
1. **Narrative framing** — flavor, art, name, kingdom of origin

A card that combines two or three of these axes will feel distinct from related cards without needing direct counter-text.

### Characters as world-state generators

Some characters carry world-state inherently. A character whose existence generates a field effect (e.g., a plague-aspected character who emits Plague in a bubble around them) acts as a hybrid between a character and a field card. The character's effect doesn't require a separate field card to be played; the character *is* the effect. The scope of the bubble (self-only, your side, the whole field) is determined by the character's tier and design. These effects follow the standard effects framework (see Combat_and_Effects.md).

-----

## Auto-Events

Some cards have Auto-Event triggers — conditions that, when met, automatically resolve an event. All Auto-Events are of one type: **Fated Encounter**.

### Fated Encounter resolutions

Each card with a Fated Encounter prints its own resolution method. Examples: fight to the death (coin flip or stat-weighted), must-attack, friendly spar, reckoning. Counter cards exist to delay or cancel Fated Encounters. Fated Encounters are printed on the cards involved and visible during deckbuilding.

-----

## Win & Loss Conditions

### You win if:

- You defeat the opposing Leader (HP reaches 0 or otherwise Disgraced)
- A specific card triggers an alternate win condition for you

### You lose if:

- Your Leader is defeated (HP reaches 0 or otherwise Disgraced)
- You **deck-out** (cannot draw a card when required)
- All your characters are Disgraced (you have no remaining characters in deck or play)
- You have not elevated a Leader by end of turn 6
- A specific card triggers an alternate loss condition for you

-----

## Card Anatomy

Each card displays the following on its face:

```
┌─────────────────────────┐
│ [Element]    Card Name  │
│                  HP XX  │
│                         │
│      [ Art ]            │
│                         │
│ ─────────────────────── │
│ Ability text (optional) │
│ Transformation paths    │
│   (on destination cards)│
│ TERMINAL tag (if applic)│
│                         │
│ "Flavor text."          │
│                         │
│            ATK XX DEF XX│
└─────────────────────────┘
```

### Required

- **Name** (top center)
- **HP** (top right, for characters)
- **Element icon** (top left)
- **ATK / DEF** (bottom right, for characters)
- **Art** (center)

### Optional (printed only when relevant)

- **Ability text** — only if the card has unique abilities or overrides default behavior
- **Activation requirement** — only if non-default
- **Transformation path** — printed on the destination form, not the origin
- **Terminal tag** — printed on terminal forms for accessibility
- **Fated Encounter** — printed on cards involved in one
- **Chain ability** — printed on cards that can initiate chains
- **Flavor text** — italicized quote, optional

### Metadata (not printed on face)

- **Affiliations** (one or more)
- **Kingdom of origin**
- **Tier rating** (for Leader-bonus calculation, especially for fall forms)
- **Set, rarity, card number, artist credit**
- **Lore / extended description**

-----

## Keyword Glossary

|Term                               |Definition                                                                                                                                                            |
|-----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Active Zone**                    |Front-row board zone, 3 slots. Cards here can attack and be attacked.                                                                                                 |
|**Passive Zone**                   |Back-row board zone, 3 slots. Holds passive characters, equipment, persistent events, and field cards.                                                                |
|**Leader Slot**                    |A dedicated 7th slot reserved for your designated Leader. Stands apart from the active/passive economy.                                                               |
|**Leader**                         |Your designated commander, elevated from your active or passive zone at end of turn 2. Lose if defeated.                                                              |
|**Elevation**                      |The act of designating a character as your Leader. Happens at end of turn 2 (with the character having been in play at least one full turn).                          |
|**Leaderless lockout**             |The penalty for not having a Leader: no character on your side may transform. Lifts when you elevate. Game-loss at end of turn 6 if persisting.                       |
|**Tier Bonus**                     |Stat bonus granted to the Leader based on their current tier: T1 +10, T2 +30, T3 +50, T4 +70 to HP/ATK/DEF.                                                      |
|**Affiliation**                    |A faction/group membership. Metadata only. Three cultural scopes (Kingdom-internal, Cross-border, Universal). Card-text references default to controller-side; (G) suffix opts in to global. |
|**(G) suffix**                     |A mark on an affiliation name in card text indicating global scope — affecting both players' characters of that affiliation, rather than just the controller's.        |
|**Element**                        |Fire, Water, Earth, Wind, Light, or Dark. Drives damage amplification. Light/Dark are also trajectories. A character may carry a hybrid element (e.g., Dark & Light).  |
|**Kingdom**                        |One of the six realms of the Sigil world. Sets are released per kingdom.                                                                                              |
|**Slot**                           |A board position. Cards occupy slots. Slots are the game's economy.                                                                                                   |
|**Discard pile**                   |Where KO'd cards go. Also referred to as the death pile. Distinct from Disgraced.                                                                                     |
|**Disgraced**                      |Permanent removal. Cannot return to play. Distinct from KO'd / discarded.                                                                                             |
|**Retire**                         |Voluntary removal of one of your own cards to free a slot. Card becomes Disgraced.                                                                                    |
|**Transform**                      |Swap one printed character form for another. The destination form must be in your hand at the moment of transformation.                                                 |
|**Upgrade / Sidegrade / Downgrade**|Types of transformations. T1/T2 sidegrades are direct; T3+ sidegrades require downgrade-then-upgrade. Upgrades may branch — same starting form, multiple destinations. |
|**Fall**                           |A transformation onto the dark path (a parallel ladder of fallen forms with their own tier ratings). Not every character has falls; some reach Dark via upgrade branches instead. |
|**Terminal**                       |A character form with no further main-progression transformation. Tagged on the card. Variable per character (T1, T2, T3, or T4). Characters may have multiple terminals across different branches. |
|**Transcend**                      |When a character upgrades to a form that no longer requires their equipment, freeing the equipment's slot.                                                            |
|**Kill**                           |A KO credited to a specific character. Persists across all transformations.                                                                                           |
|**Chain Attack**                   |A coordinated multi-character attack initiated by a printed chain ability. Initiator earns KO credit; damage counts toward all participants' banked-damage totals.    |
|**Damage**                         |Instant, irreversible reduction of current HP. Persists when source is removed.                                                                                       |
|**Heal**                           |Instant restoration of damage taken. Persists when source is removed. Capped at current Max HP unless overheal is explicitly granted.                                 |
|**Max HP modifier**                |A buff or debuff to the HP ceiling. Tied to source; reverses on removal. Follows cap-only rule.                                                                       |
|**Entry rule**                     |Characters enter play at full base Max HP, then active bonuses apply.                                                                                                 |
|**Sustained-by**                   |A creature with a degenerate base stat line that requires an active Max HP source to be played. KO'd if the source is removed.                                        |
|**Effect**                         |A persistent or one-shot consequence produced by a source card. No separate "status system"; each effect is card-specific. Effects end when source is removed.        |
|**Auto-Event**                     |A board-state-triggered automatic event. Single type: Fated Encounter.                                                                                                |
|**Fated Encounter**                |An automatic conflict between specific opposing characters. Resolution varies per card.                                                                               |
|**Persistent Event**               |An event card that occupies a passive slot and remains until removed.                                                                                                |
|**One-Shot Event**                 |An event card that resolves from hand and discards immediately.                                                                                                       |
|**Field Card**                     |A world- or kingdom-scope card occupying a passive slot, altering the board's environment. World-state cards affect both sides; Kingdom cards affect only their owner.|
|**Mathematical Opposition**        |The design principle that no card directly counters another by name; opposition emerges from numerical and conceptual interaction.                                    |

-----

## Resolved from v0.3

The following questions and ambiguities from v0.3 are now resolved in v0.4:

- **Chain Attack mechanics locked.** Chain abilities are printed per-card with name, chain size, affiliation requirement, optional zone restriction, damage formula, and costs. Initiator counts toward N if affiliated; otherwise participates in addition. Chains attack as initiator's element with per-participant elemental amplification. KO credit to initiator; damage contribution to all participants. Multiple chains per turn allowed. Active and passive participation permitted by default. Chain fizzles if any participant removed. See Combat_and_Effects.md for full reference.
- **HP framework split into three categories.** Damage (instant, irreversible), Heal (instant restoration, persists), and Max HP modifier (buff/debuff to ceiling, tied to source). The v0.3 "all HP gains tied to source" rule now applies specifically to Max HP modifiers, not heals.
- **Max HP modifications follow cap-only rule.** Current HP only follows the ceiling if it would exceed it. Plague at 20/40 → 20/30 (no current HP loss); Plague at 40/40 → 30/30 (current capped down).
- **Card effects are one-time on play by default.** Per-turn ticks require explicit card text. Permanent (source-detached) effects also require explicit text.
- **Entry rule established.** Characters enter at full base Max HP, then active bonuses apply.
- **Sustained-by creature category introduced.** Degenerate stat-line characters that require a sustaining Max HP source to be playable.
- **Effects framework established.** No separate "status system" — effects are produced by sources, tracked implicitly, end when source is removed. Categorical vocabulary (element, mechanism, source type) emerges per card.
- **Fall trigger specificity locked.** Fall triggers reference specific cards or conditions, not abstract categories. Future cards must opt in explicitly.
- **Wise Sage rewrite to use explicit override.** Her ability is rewritten as an explicit additive effect (entry heal + Max HP buff + cascade-loss) rather than relying on default Max HP rules.
- **Discard pile / death pile terminology unified.** Both terms refer to the same zone; the rules text uses "discard pile" consistently.

-----

## Resolved from v0.4

- **Base tier collapsed into T1.** The tier ladder now starts at T1 as the floor. The Leader Tier Bonus table and glossary entry no longer reference "Base / T1" — just "T1". No mechanical change; Base was always a synonym for T1 in practice.
- **The Destined retired as a Kaethlaan-internal institution** (lore-side change, see Kaethlaan.md v0.3). The Destined tag remains valid as a world-level affiliation with scope TBD; no ruleset-side change other than that no character is currently designed with The Destined affiliation.
- **Kingdom-as-affiliation refactor considered and declined.** Kingdom remains a separate field on each card (metadata only, not on the card face) rather than being folded into the affiliations list. The split keeps set-release framing and per-card visual identity intact.

-----

## Resolved from v0.5

- **Shadow element renamed to Dark.** Global rename across the ruleset, Combat & Effects, and Kaethlaan lore. The matchup table, cosmological-pair framing, and effects-category vocabulary all use *Dark* now. The studied-door / suffered-door framing and Light/Dark-as-trajectory double meaning are preserved unchanged.
- **Affiliation mechanical scope rule locked.** Card-text references to affiliations default to controller-side; (G) suffix on the affiliation name opts in to global (cross-side) scope. The Mathematical Opposition principle now has a clean default behavior: your cards make positive statements about your army by default.
- **Hybrid elements admitted as a category.** A character may print a compound element (e.g., *Dark & Light*) and belong to both for elemental-matchup purposes. The Ascended is the first canonical example.
- **Branched upgrades formalized.** A character may have multiple upgrade destinations from the same form (e.g., Mage Arlia upgrades to either Arlia, Youngest Archmage *or* The Wandering Acolyte Arlia, depending on which transformation conditions are met). Branched upgrades are distinct from sidegrades and from falls; they live on the main-progression ladder.
- **Multiple terminals per character.** A character may have more than one TERMINAL form across different branches (Arlia, for example, terminates at three distinct T3+ forms reachable through three different upgrade paths).
- **Falls are not every character's dark-path.** Some characters who reach Dark do so through chosen upgrade branches rather than breakage-falls. The Fall category remains valid for characters whose dark-trajectory IS dramatized as breakage (Kael's Plagued/Plague Bringer line, for example); it is not universal.
- **Arlia roster locked.** Seven cards: *Arlia, Destined Trainee* (T1) → *Mage Arlia* (T2), *Squire Arlia* (T2); *Mage Arlia* → *Arlia, Youngest Archmage* (T3 TERMINAL), *The Wandering Acolyte Arlia* (T3); *Squire Arlia* → *Captain Arlia of the Royal Army* (T3 TERMINAL); *The Wandering Acolyte Arlia* → *The Ascended* (T4 TERMINAL). Canonical card data lives in the Card Forge / Sigil_Cards.csv.

-----

## Resolved from v0.6

- **Equipment and items can be destroyed directly.** Card effects that say so may target and destroy equipment and items (and other effect-source cards) outright — destruction is no longer only an indirect consequence of losing the bearer or of retirement. When a source is destroyed, every effect it granted ends immediately (effects framework). This gives real teeth to negate-and-destroy shields (e.g., *Magical Shield*) and to downside clauses that punish a card's destruction (e.g., *Protection of The Divine*).
- **Transformation destinations must be in hand.** A transformation swaps the in-play origin card for its destination form, and that destination card must be in the controller's hand at the moment of transformation. Drawing or searching out later forms is now part of the game; a character cannot advance to a form you have not drawn. See Transformation System.
- **Deck-search (tutoring) sanctioned as a mechanic.** Searching your deck to add a specific card to hand is a legal effect, with a guardrail: tutors stay archetype/affiliation-locked and carry a real cost (a discard, a slot, or tempo). No generic, free "search any card" tutors. *Call of the Channel* (discard 1, fetch a Divine Channel card) is the first example, and it earns its place precisely because destinations must be in hand.

-----

## Open Questions (for v0.8)

These remain unresolved.

### Game flow

- **"At end of turn" vs "at start of turn" timing.** Need a consistent ordering system for simultaneous effects.
- **Mulligan rules.** Single free mulligan, or scry-style filter?
- **Hand size limit.** Default 7? Any cap?
- **Card draw beyond turn 1.** Fatigue mechanics, or just deck-out as the timer?
- **Auto-Event resolution math.** Default formula for stat-weighted Fated Encounters.

### Board state

- **Active/passive vulnerability principle.** A working idea: active = vulnerable, passive = protected. Cross-cutting rule affecting equipment, field cards, persistent events. May enable "Hand of God" style removal cards that target active non-character cards. Needs full design pass.
- **Persistent event slot competition.** Confirm assumption that you can only play persistent events into your own passive zone, not the opponent's.
- **Equipment as a combat target.** *Resolved:* equipment and items can be targeted and destroyed by effects (see Resolved from v0.6). *Still open:* whether non-character cards additionally carry their own HP/DEF and can be *attacked in the combat phase* like a character, or whether they are only ever removed by effects. Current working model is effect-removal only.
- **Disgrace pile interaction.** Several cards reference it. Need to define visibility (public? hidden?) and ordering rules.

### Card categories needing development

- **Healing as a category.** Spot heals and HoTs are now defined; need canonical examples in cards.
- **Effects as ecology.** Plague ↔ Medical Advancement is the canonical Mathematical Opposition example. Need similar canonical examples for other effect categories (status removal, character protection, transformation prevention).
- **Sustained-by creature designs.** First canonical examples needed.
- **One-shot ATK/DEF buff duration.** The three-part HP framework governs HP only. A one-shot event or item that grants +ATK or +DEF has no defined duration — until end of turn? until end of your next turn? permanent? *Shield Wall* sidesteps the gap by being a Persistent Event (its buff is tied to source and reverses on removal), but a general ruling is needed before one-shot combat-trick stat buffs can be printed cleanly.

### Affiliation specifics

- **Attuned scope and meaning.** Introduced on *Arlia, Youngest Archmage* and referenced in her chain ability *Consortium*. What is it conceptually — a Mages Guild sub-tag, a cross-cutting magical-resonance state, or something else? Cultural scope and gameplay-shape both TBD.

### Hybrid element edge cases

- **Light vs Dark & Light.** Light deals +10 against Dark. Does it deal +10 against a Dark & Light hybrid? (Working assumption: yes, because the hybrid contains Dark; the Light component does not negate the matchup.)
- **Dark's DEF-ignore vs Dark & Light defender.** Same question in reverse. (Working assumption: yes, same logic.)
- **Self-attack from a hybrid attacker against a hybrid defender.** Light & Dark attacking Light & Dark — full mutual amplification, or no amplification? Needs an explicit rule.

-----

*Sigil v0.7 — a designer's notebook. Everything here is subject to change. The game emerges from the cards as much as from the rules.*
