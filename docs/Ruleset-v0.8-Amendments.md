# Sigil — Ruleset v0.8 Amendments

### Rules decided in simulator/balancing sessions, not yet folded into *Ruleset v0.7*

This companion doc records mechanics that **supersede / extend** the v0.7 Ruleset, in the same
spirit as the brief's §5 amendments. When *Ruleset v0.8* is cut, these fold into the main text
(Transformation System + Leader System). Until then, **these are the intended rules** and the
simulator implements them.

-----

## Metamorphosis (Wild enabler)

A one-shot **Metamorphosis** event (T1) transforms a **T1 Wild you control into any T2 Wild in
your hand** — an *any-to-any* morph with no fixed lineage (the destination is not printed as a
transform-in on the T2 form).

- Does **not** use your transformation action (you may morph *and* transform the same turn).
- Keeps the body's **banked kills**; the body's element becomes the new form's.
- Destination must be **in hand** (standard transform rule). Consumed on use.

This is how the Wild archetype reaches its six T2 terminals — Embermaw (Fire), Craghide (Earth),
Skirrl (Wind), Tidewretch (Water), Hollowed Stag (Light), Gravecreep (Dark).

-----

## Fusion — the Apex mechanic

Fusion is a transformation-adjacent mechanic for the **go-wide** archetypes. The two printed
Fusion cards are Wild's **Primal Fusion** and Goblin's **Pile On**; both use the same engine. A
Fusion event merges two creatures **of its affiliation** that you control into one growing
predator — the **Apex**.

**Merge.** One chosen creature becomes the Apex and **absorbs** the other, gaining its base
**ATK and HP** — but **not** its DEF (the Apex is a glass cannon: a growing threat, not a wall).
The Apex also inherits the absorbed creature's banked kills. The absorbed creature, and any
**equipment** attached to it, leaves play. The Apex keeps its own form and tier, so a fused T1
Wild can still Metamorphose afterward.

**Chainable.** The Apex tracks its **fusion count** — how many creatures it has absorbed over the
game. You may keep feeding the *same* Apex with further Fusion cards; it grows each time and its
count climbs.

**Escalation (by fusion count).**
- **2 or more absorbed** → the Apex gains **reach**: it may attack the **passive zone**.
- **3 or more absorbed** → the Apex may attack the **opposing Leader** directly, ignoring zone
  restrictions (as a `hit_leader` attacker).

**Element effect.** Each fusion also triggers an effect keyed to the **absorbed** creature's
element (hybrids fire both components):

| Element | Effect on fusion |
|---------|------------------|
| Fire    | 10 damage to an enemy |
| Water   | the Apex heals 10 |
| Earth   | the Apex gains +10 DEF, **permanently** |
| Wind    | the Apex gains +10 ATK, permanently |
| Light   | heal your most-wounded ally 10 |
| Dark    | 10 damage to the opposing Leader |

**Cost & timing.** Fusion does **not** use your transformation action. Each printed Fusion card
costs a card **discard** to fire. This is a deliberately card-hungry combo loop — fed by cheap,
weak go-wide bodies (the Wild T1s are nerfed into *fusion fuel*) and by card-draw / tutor
cantrips on those bodies (e.g. Galewing draws; Sootcrawler tutors a Primal Fusion). It is meant
to play like a "flood the board, churn cards, build one escalating monster" deck — a distinct
*speed* from Goblin's immediate go-wide anthem.

> **Design note (sim balance):** because the simulator's greedy AI fuses near-optimally, *frequent*
> fusion is strong; the discard cost and the weak fuel bodies are the balancing levers. At the
> tuned numbers the Wild deck sits ~53% and fuses in ~59% of games, with the deep ×2/×3 escalation
> chains as a rarer top-end payoff.

-----

## The Ascended — item consumption (clarification)

The Ascended's printed ability sets its **HP / ATK / DEF** to **(items discarded during its
transformation) × 20**, of **any tier**. The transform-in's "at least one T3 item" is only an
**entry gate** — when The Ascended transforms, **every** item in your hand (any tier, not just
T3) is consumed and counted toward the ×20. Stat-modifying riders on the consumed items do **not**
apply (you trade their printed buffs for the ×20); ability-grant riders still apply.

-----

## Character-specific Leader rules — King Honathan (clarification)

Per the v0.7 "Character-specific Leader rules" (a card may print its own Leader behavior that
overrides the general slot rules), **King Honathan of Kaethlaan** prints a **conditional**
protected-Leader rule: *"while you control a Royal Army character, King Honathan cannot be
attacked."* He is therefore exposed like any other Leader once you control **no** Royal Army
character — the protection is not unconditional. (The simulator enforces exactly this printed
condition.)
