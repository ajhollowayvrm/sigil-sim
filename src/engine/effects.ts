// Persistent effects: start-of-turn ticks (regrow, HoT, world-state war
// attrition, war burnout), KO cleanup (with equipment discard + on-KO draws),
// and on-entry triggers. Pure — no React/DOM.

import { comps } from "./elements";
import { log, logging } from "./log";
import { boardChars, chars, draw, effMaxhp, eventSlot, immuneItemEvent, isEquipObj, isKaethlaan } from "./stats";
import { getCard } from "../data/loadCards";
import { TUTOR } from "../data/effects-map";
import type { Player, Unit } from "./types";

const has = (arr: string[], x: string) => arr.includes(x);

// ----- Seeker (deck-dig): once per turn, look at the top 3 cards of your deck and
// reorder them freely. Bodies draw from the END of the deck array, so "the top of
// your deck" = its last cards. We surface a comparator and the reorder so the policy
// can place the most useful card on top (engine stays choice-free).

/** True if `p` controls a Seeker character with its once-per-turn dig still available. */
export function seekerReady(p: Player): Unit | null {
  return chars(p).find((u) => has(u.t.abil, "seeker") && !u.seekerUsed) ?? null;
}

/** Reorder the top `n` (default 3) cards of the deck so that, after the rearrange,
 *  `betterFirst(a, b) === true` means `a` is drawn before `b` (i.e. ends up nearer the
 *  end of the array). Spends the controller's per-turn Seeker use. Deterministic given
 *  a deterministic comparator. */
export function seekerReorder(p: Player, betterFirst: (a: string, b: string) => boolean): void {
  const u = seekerReady(p);
  if (!u) return;
  u.seekerUsed = true;
  const n = Math.min(3, p.deck.length);
  if (n <= 1) return;
  const top = p.deck.slice(p.deck.length - n); // the next `n` draws (last = drawn first)
  // Sort so the best is LAST in the array (drawn first). betterFirst(a,b) → a precedes b
  // in draw order → a should be later in the array. Stable insertion preserves order on ties.
  top.sort((a, b) => (betterFirst(a, b) ? 1 : betterFirst(b, a) ? -1 : 0));
  for (let i = 0; i < n; i++) p.deck[p.deck.length - n + i] = top[i];
}

// ----- tutors (deck search) -----

export function isTutor(name: string): boolean {
  return name in TUTOR;
}

/** The cards in `p`'s deck this tutor could fetch. */
export function tutorTargets(p: Player, name: string): string[] {
  const spec = TUTOR[name];
  if (!spec) return [];
  if (spec.kind === "transform_form") {
    const dests = new Set<string>();
    for (const u of chars(p)) {
      // Wilds have no fixed lineage — they advance only through Metamorphosis (§5.5),
      // so a structured tutor like Field Promotion can never fetch their next form.
      if (u.t.affils.includes("Wild")) continue;
      for (const [d] of u.t.upg) if (p.deck.includes(d)) dests.add(d);
    }
    return [...dests];
  }
  return p.deck.filter((c) => {
    const cc = getCard(c);
    return !!cc && cc.affils.some((a) => spec.affils.includes(a));
  });
}

/** Can `p` pay this tutor's printed cost right now? A discard tutor needs that many
 *  OTHER cards in hand to pitch (the tutor itself is spent, not discarded). */
export function tutorPayable(p: Player, name: string): boolean {
  const spec = TUTOR[name];
  if (!spec) return false;
  if (spec.kind === "affil" && spec.discard) return p.hand.length - 1 >= spec.discard;
  return true;
}

/** Deterministically pick the least valuable card in hand to discard as a tutor cost:
 *  junk (events/items, value 10) before bodies, lowest stats first, name as the
 *  tiebreak so same seed ⇒ same discard. */
function pickDiscard(p: Player): string | null {
  let best: string | null = null;
  let bestVal = Infinity;
  for (const cardName of p.hand) {
    const c = getCard(cardName);
    const val = c && c.simulatable ? c.tier * 100 + c.atk + c.hp + c.deff : 10;
    if (val < bestVal || (val === bestVal && best !== null && cardName < best)) {
      bestVal = val;
      best = cardName;
    }
  }
  return best;
}

/** Play the tutor: consume it, pay any discard cost from the remaining hand, then move
 *  `fetched` from deck to hand. (No reshuffle — the order beneath is already random;
 *  revealing one card leaks no advantage here.) */
export function applyTutor(p: Player, name: string, fetched: string): void {
  const spec = TUTOR[name];
  const ti = p.hand.indexOf(name);
  if (ti >= 0) p.hand.splice(ti, 1);
  if (spec && spec.kind === "affil" && spec.discard) {
    for (let i = 0; i < spec.discard; i++) {
      const d = pickDiscard(p);
      if (d == null) break;
      p.hand.splice(p.hand.indexOf(d), 1);
      if (logging()) log(`${p.name}: ${name} — discards ${d}`);
    }
  }
  const di = p.deck.indexOf(fetched);
  if (di >= 0) {
    p.deck.splice(di, 1);
    p.hand.push(fetched);
  }
  if (logging()) log(`${p.name}: ${name} — searches up ${fetched}`);
}

// ----- world-state wars (§5.4: they hit active zones on BOTH sides) -----

export function activeWars(players: Player[]): Set<string> {
  const s = new Set<string>();
  for (const pl of players) for (const w of ["War", "Holy War", "Goblin War"]) if (pl.events.has(w)) s.add(w);
  return s;
}

export function warDamageFrom(pl: Player, u: Unit, wars: Set<string>): number {
  if (pl.events.has("Hardened Veterans") && has(u.t.affils, "Royal Army")) return 0; // controller-side immunity
  if (pl.events.has("Close the Gates") && isKaethlaan(u)) return 0; // Kaethlaan held the wall
  let d = 0;
  if (wars.has("War")) d += 10;
  if (wars.has("Holy War")) d += comps(u.t.elem).includes("Light") ? 0 : u.t.elem === "Dark" ? 20 : 10;
  if (wars.has("Goblin War") && !has(u.t.affils, "Goblin")) d += 10;
  return d;
}

/** Controller-only war damage — used by the AI's shelter heuristics. */
export function warDamage(p: Player, u: Unit): number {
  return warDamageFrom(p, u, activeWars([p]));
}

export function cleanup(pl: Player): void {
  for (const lst of [pl.active, pl.passive]) {
    for (const u of lst.slice()) {
      if (u.hp <= 0) {
        for (const e of pl.pcards.filter((e) => isEquipObj(e) && e.link === u)) {
          pl.pcards.splice(pl.pcards.indexOf(e), 1);
          if (logging() && isEquipObj(e)) log(`${pl.name}: ${e.name} is discarded (bearer KO'd)`);
        }
        lst.splice(lst.indexOf(u), 1);
        if (pl.events.has("Horde Frenzy") && has(u.t.affils, "Goblin")) {
          draw(pl);
          if (logging()) log(`${pl.name}: Horde Frenzy — draws on a Goblin's death`);
        }
      }
    }
  }
  if (pl.leader && pl.leader.hp <= 0) pl.lose = true;
}

// ----- entry triggers (the §6 text->primitive mapping, keyed by name) -----

function healLowest(p: Player, amt: number): void {
  const cand = chars(p).filter((c) => c.hp < effMaxhp(p, c));
  if (!cand.length) return;
  const t = cand.reduce((a, b) => (b.hp / effMaxhp(p, b) < a.hp / effMaxhp(p, a) ? b : a));
  t.hp = Math.min(effMaxhp(p, t), t.hp + amt);
}

const ENTRY: Record<string, (p: Player, opp: Player, u: Unit) => void> = {
  dmg_mages: (p, _opp, u) => {
    for (const x of chars(p)) if (x !== u && has(x.t.affils, "Mages Guild")) x.hp -= 10;
  },
  dmg_opp_active: (_p, opp, _u) => {
    if (opp.active.length) {
      const t = opp.active.reduce((a, b) => (b.hp > a.hp ? b : a));
      t.hp -= 10;
    }
  },
  heal_lowest: (p, _opp, _u) => healLowest(p, 10),
  // Seremin the Sickly is the carrier: on entry he plays Plague from hand or deck — the
  // archetype's turn-1 enabler. Bypasses Plague's normal T2 tier-gate (it's a printed entry
  // effect). Plague is a both-sides field, so it's mirrored onto the opponent (like a war).
  bring_plague: (p, opp, _u) => {
    if ((p.plagueField || 0) >= 2) return; // already capped — don't stack further
    const src: string[] | null = p.hand.includes("Plague") ? p.hand : p.deck.includes("Plague") ? p.deck : null;
    if (!src) return; // no Plague to bring
    const z = eventSlot(p);
    if (!z) return; // no slot for the field card
    src.splice(src.indexOf("Plague"), 1);
    p.eventZones["Plague"] = z;
    p.events.add("Plague");
    p.pcards.push("Plague");
    p.plagueField = (p.plagueField || 0) + 1;
    opp.plagueField = (opp.plagueField || 0) + 1; // mirror onto the opponent (world-state)
    for (const pl of [p, opp]) for (const x of chars(pl)) x.hp = Math.min(x.hp, effMaxhp(pl, x)); // cap-only clip
  },
};

/** Fires on hard-cast, transform, and Metamorphosis (§6). */
export function fireEntry(p: Player, opp: Player, u: Unit): void {
  const key = u.t.entry;
  if (!key) return;
  const f = ENTRY[key];
  if (!f) return;
  f(p, opp, u);
  if (logging()) log(`${p.name}: ${u.t.name} — entry effect`);
  cleanup(opp);
  cleanup(p);
}

export function startOfTurn(p: Player, opp: Player, turn: number): void {
  for (const u of chars(p)) {
    u.movedThisTurn = false; // a fresh reposition each turn
    u.shielded = false; // Sanctuary / Bulwark last only until your next turn
    u.tempDef = 0;
    u.seekerUsed = false; // the once-per-turn deck-dig refreshes
  }
  // Bodyguard redirect is "once per your OPPONENT's turn": the active player's turn is
  // the opponent's turn for the defender, so refresh both sides' redirect at each turn
  // start. (Resetting the active player's own flag here is harmless — it never defends
  // on its own turn.)
  for (const u of chars(p).concat(chars(opp))) u.redirectUsed = false;
  p.transformedThisTurn = false; // the one-per-turn transform action refreshes
  p.extraTransforms = 0; // Opportunity's bonus actions don't carry over
  // Regrow heal-over-time.
  for (const u of chars(p)) if (has(u.t.abil, "regrow") && u.hp < effMaxhp(p, u)) u.hp = Math.min(effMaxhp(p, u), u.hp + 10);
  // Plague-duration: a body accrues a "Plagued turn" at the start of each of your turns while
  // a Plague field is up — the cost that gates the Experiment / Plagued Person climbs.
  if ((p.plagueField || 0) > 0) for (const u of chars(p)) u.plaguedTurns = (u.plaguedTurns || 0) + 1;
  // The Long Road: HoT on a Disillusioned/Wandering bearer (modeled as a passive event flag).
  // An EVENT effect — a Protection of The Divine bearer cannot receive it.
  if (p.events.has("The Long Road"))
    for (const u of boardChars(p))
      if (["Wandering", "Faithless"].some((a) => has(u.t.affils, a)) && u.hp < effMaxhp(p, u) && !immuneItemEvent(p, u)) {
        u.hp = Math.min(effMaxhp(p, u), u.hp + 10);
        break;
      }
  // World-state war attrition — every war in play (EITHER side) hits active zones on BOTH sides.
  const wars = activeWars([p, opp]);
  if (wars.size) {
    for (const pl of [p, opp])
      for (const u of pl.active.slice()) {
        const d = immuneItemEvent(pl, u) ? 0 : warDamageFrom(pl, u, wars); // Protection of The Divine: war is an event
        if (d > 0) {
          u.hp -= d;
          if (logging()) log(`${pl.name}: ${u.t.name} suffers ${d} war attrition → ${Math.max(0, u.hp)} HP`);
        }
      }
    cleanup(p);
    cleanup(opp);
  }
  // War burnout coin-flips (seeded RNG so games stay deterministic).
  for (const w of Object.keys(p.war_turns)) {
    p.war_turns[w] += 1;
    if (p.war_turns[w] > (w === "Holy War" ? 4 : 2) && p.rnd() < 0.5) {
      p.events.delete(w);
      delete p.war_turns[w];
      if (logging()) log(`${p.name}: ${w} burns out`);
    }
  }
  // turn is referenced by callers for sequencing; no per-turn use here yet.
  void turn;
}
