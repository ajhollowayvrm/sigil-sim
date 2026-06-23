# Sigil — Combat & Effects

### Companion to the Ruleset (v0.7)

This document is the focused mechanical reference for combat, HP modification, and persistent effects. It assumes familiarity with the core ruleset (slot economy, turn structure, character cards, transformation system). For topics not covered here, see the main Ruleset.

-----

## Chain Attacks

Chain attacks are coordinated multi-character attacks initiated by a printed chain ability. They concentrate damage from multiple characters into a single attack against one target (or, in advanced variants, multiple targets).

### Chain abilities are printed

A character can only initiate a chain attack if they have a printed chain ability. Chain abilities specify:

- **A name** (e.g., "Triangle Attack", "Rush", "Press the Attack")
- **A chain size** (e.g., "Chain 2" for exactly 2 participants, "Chain 1-3" for a range)
- **An affiliation requirement** (e.g., "Goblin", "Kaethlaan Knights")
- **A zone restriction** (optional; defaults to either active or passive)
- **A damage formula** (defaults to total ATK sum against the target's DEF, resolved once; cards may override)
- **Costs and side effects** (e.g., chained participants cannot attack again this turn)

Chain abilities can exist at any tier — there is no T1 floor. The most basic case is two T1 creatures fighting together.

### Counting the chain

"Chain N [Affiliation]" requires N participating characters with that affiliation. The initiator always participates.

- **If the initiator shares the affiliation**, they count toward N.
- **If the initiator does not share the affiliation**, they participate in addition to the N affiliated characters.

Example: Lor'oak Goblin Commander's "Rush — Chain 2 Goblin Active" requires Commander + 1 active Goblin ally = 2 total. A hypothetical non-Goblin orchestrator with "Chain 2 Goblin" would chain with 2 Goblins + themselves = 3 total characters in the chain.

### Damage and DEF

Default damage formula: **sum of all participants' ATK**, resolved once against the target's DEF. Card text may override (e.g., "sum -20", "highest + lowest", "sum × 1.5", "sum + 30"). DEF resolution is per-ability and is also printable — the default is one DEF check against the total.

### Element of the chain

A chain attacks as the initiator's element. Each participant contributes an elemental amplification bonus when the chain element beats the target's element (+10 per participant when the matchup favors the chain).

Example: A Fire initiator chains with two Earth participants against an Earth target. The chain attacks as Fire (Fire > Earth). All three participants contribute +10 each, totaling +30 elemental amplification on top of the base ATK sum.

### Kill credit and damage contribution

- **KO credit** goes only to the chain's initiator. Transformation triggers that say "when this character KOs" fire only for the initiator.
- **Damage contribution** counts toward each participant's banked-kill total for transformation thresholds based on accumulated damage dealt.

### One attack per character per turn

A character spends their attack action once per turn — solo or as a chain participant. A participant in chain A cannot also join chain B that turn, nor attack solo.

### Multiple chains per turn

There is no cap on chains per turn beyond character availability. You may run multiple chains in one turn, subject to no character participating twice.

### Active and passive participants

By default, chain participants may be in either zone. Cards can restrict (e.g., "Chain 2 Kaethlaan Knights Active" requires all participants to be in the active zone).

Passive characters remain passive after participating — they do not move zones. They cannot attack solo from the passive zone; chain participation is their only attack avenue.

### Auras and buffs in the sum

Aura effects on participants apply normally to their contributed ATK. A buffed participant contributes their buffed ATK.

### Chain interruption

If any participant is removed (KO'd, Disgraced, returned to hand) before the chain resolves, the chain fizzles entirely. No damage is dealt.

Chain-breaking cards (e.g., Fog of War, a continuous game-level field card) can disrupt chains from the moment they enter play.

### Leaders in chains

Leaders may participate in chains initiated by characters of their affiliation. The Leader's tier bonus applies to their contributed ATK.

### Multi-target and other variants

The default is one invocation against one target. Chain abilities may print other shapes — multi-target, multi-hit, area effects. The card text defines what the chain does.

### Sample chain abilities

**Captain Arlia of the Royal Army — Triangle Attack**

> Chain 3 Kaethlaan Knights. Damage equals sum of all participants' ATK + 30, vs target's DEF once.

**Lor'oak Goblin Commander — Rush**

> Chain 2 Goblin Active. Damage equals sum of attacks vs target's DEF.

-----

## HP Framework

There are three distinct categories of HP-affecting effects in Sigil. Each behaves differently.

### Damage

**Instant, irreversible reduction of current HP.** Dealt by attacks, ability effects, or events. Once dealt, damage is "spent" — it persists even if the source is later removed.

### Heal

**Instant restoration of damage taken.** Once dealt, heal effects persist. Removing the source of a heal does not undo it. By default, healing is capped at the recipient's current Max HP — overheal above Max requires explicit card text.

Healing comes in two flavors:

- **Spot heal**: instant restoration, played as a one-shot effect.
- **Heal over time (HoT)**: a per-turn heal granted by a persistent source. Ticks at the start of each of the controller's turns, beginning the turn after the source is played.

### Max HP modifier

**A buff or debuff to the recipient's HP ceiling.** Stays in effect while the source is in play. Tied to source — reverses if the source is removed.

Max HP modifications follow the **cap-only rule**:

- When Max HP is reduced, current HP follows down only if it exceeds the new Max (caps down). A character at 20/40 hit by -10 Max HP becomes 20/30 — current was already below the new ceiling, so it does not change.
- When Max HP is increased, current HP does not auto-rise. A character at 30/40 buffed by +10 Max HP becomes 30/50 — ceiling raised, current unchanged.
- When a Max HP debuff is removed, the ceiling restores but current HP stays where it was. A character at 30/30 (Plagued) whose Plague source is destroyed becomes 30/40 — still hurt, but now able to heal back up.
- When a Max HP buff is removed, the ceiling drops back; current HP caps down if it exceeded the new (lower) Max.

### Card-specific overrides

Specific cards may print effects that override the defaults. A card may grant additive current HP on entry (a one-shot heal bundled with a Max HP buff), cause cascade damage on removal (current HP loss when the source dies), or grant overheal capacity. These behaviors are printed explicitly on the card.

Example — Wise Sage's "Quiet Power": "When Wise Sage enters play, all your other characters heal 10. While she is in play, your other characters have +10 Max HP. When Wise Sage leaves play, all your other characters lose 10 current HP." This combines an entry heal, a continuous Max HP buff, and an explicit cascade-loss. The cascade-loss is a deliberate card override, not the default behavior of Max HP buffs.

### Default: one-time effects

By default, a card's effect happens once when it enters play, and persists while the card is in play. Per-turn ticks (repeating effects each turn) require explicit card text — for example, "At the start of each of your turns, heal 10."

### Default: tied to source

By default, ongoing effects end when their source leaves play. Permanent effects (those that persist after the source is removed) require explicit card text — for example, "Permanently grant +20 Max HP to target character."

-----

## Effects Framework

There is no separate "status system" in Sigil. There are simply **effects produced by sources** — field cards, character abilities, persistent events, equipment-linked effects. Each effect is defined on its source card.

### Implicit tracking

Effects are not tracked with tokens on affected cards. An effect exists because its source is in play. When the source leaves play, the effect ends.

### Source-removal ends the effect

When the source of an effect is removed (Disgraced, KO'd, destroyed, or returned to hand), the effect immediately ends. Future ticks do not happen. Past damage stays "spent" (the standard damage rule). Max HP modifications reverse (the standard Max HP rule). Note: equipment and items are effect-sources that can now be **destroyed directly** by card effects (see Ruleset), so destruction is a standard way for an equipment- or item-granted effect to end.

### No shared status vocabulary

Each effect is card-specific. There is no universal "Plagued" template that all plague-like cards must conform to. A future Curse of Darkness can define its own numbers and behavior, distinct from Plague.

### Categorical vocabulary emerges organically

Cards that interact with effects in bulk reference them by category, not by specific card name. Useful categories include:

- **Element** — Dark effects, Light effects, Fire effects
- **Mechanism** — damage-over-time, restriction, aura, Max HP debuff
- **Source type** — field card effects, character emission effects, persistent event effects

A card may print "Remove all Dark effects on your characters" or "Immune to Max HP debuffs this turn." These reach for categories, not specific cards — consistent with Mathematical Opposition.

### Fall triggers reference specific cards

When a character's fall trigger references an effect, it names the specific card or condition. "Falls while Plague is in play" is the canonical form. A future Plague-equivalent card would not automatically satisfy this trigger unless its own text explicitly references Plague-equivalence.

This is a deliberate constraint: each fall trigger is crisp and unambiguous at print time. Future cards may opt into existing fall ecosystems explicitly.

-----

## Entry Rule

When a character enters play, they enter at **full base Max HP**, then any active bonuses (Max HP modifiers, auras, etc.) apply.

For most characters, this means they enter at their printed HP value, then bonuses raise the ceiling further. For sustained-by characters (see below), this enables a 0/0/0 monster to enter at 10/10 if a +10 Max HP source is in play — the bonus raises both Max and current HP at the moment of entry.

-----

## Sustained-By Creatures

Some characters have degenerate base stat lines (e.g., 0/0/0) that prevent them from being playable without a sustaining effect. These are sustained-by creatures.

### How they work

A 0/0/0 (or similarly degenerate) character cannot be played from hand into a 0-HP state — they would be KO'd immediately on entry. They can only be played when an active Max HP modifier raises their Max HP above 0.

Per the entry rule, they enter at the full current Max HP — which includes active buffs. A 0/0/0 monster entering while Wise Sage is in play (her +10 Max HP active) enters at 10/10.

### When the source ends

When the sustaining source leaves play, the Max HP modifier reverses (cap-only rule). The creature's Max HP returns to 0; current HP caps down to 0; the creature is KO'd and goes to the discard pile.

This is not Disgraced — sustained-by creatures KO normally and may return via discard-pile-interaction effects.

### Design space

Sustained-by creatures create deck-building dependencies. They are only playable in decks that include sustaining sources, and they are vulnerable to the source's removal. They reward "circular" deck constructions where multiple cards reinforce each other. They do not reference specific source cards — any sufficient Max HP modifier sustains them.

-----

## Terminology Notes

- **Discard pile / death pile** — the same zone. Cards that are KO'd or otherwise removed without being Disgraced go here. The game's "graveyard."
- **Disgraced** — permanent removal. Out of play, banished, cannot return.

-----

*Sigil — Combat & Effects v0.3. Companion to Ruleset v0.7.*
