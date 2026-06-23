// Per-ply frame capture for watch mode. The engine emits immutable snapshots
// here; the UI scrubs through them and never touches rules logic.

import type { Recorder } from "../engine/game";
import { game } from "../engine/game";
import { mulberry32 } from "../engine/rng";
import { effAtk, effDef, effMaxhp, isEquipObj, linkedEquips } from "../engine/stats";
import type { Player, Unit } from "../engine/types";
import { greedyPolicy } from "./ai";

export interface UnitSnap {
  name: string;
  elem: string;
  tier: number;
  hp: number;
  maxhp: number;
  atk: number;
  def: number;
  wartorn: boolean;
  kills: number;
  leader: boolean;
  equips: string[];
}

export interface SideSnap {
  name: string;
  leader: UnitSnap | null;
  active: UnitSnap[];
  passive: UnitSnap[];
  charging: string[];
  events: string[];
  hand: number;
  deck: number;
  lockout: boolean;
}

export interface Frame {
  t: number;
  turn: number;
  actor: string | null;
  lines: string[];
  A: SideSnap;
  B: SideSnap;
  result: { w: string; why: string } | null;
}

function snapUnit(p: Player, u: Unit): UnitSnap {
  return {
    name: u.t.name,
    elem: u.t.elem,
    tier: u.t.tier,
    hp: Math.max(0, u.hp),
    maxhp: effMaxhp(p, u),
    atk: effAtk(p, u),
    def: effDef(p, u),
    wartorn: u.wartorn,
    kills: u.kills,
    leader: u.leader,
    equips: linkedEquips(p, u).map((e) => e.name),
  };
}

function snap(p: Player): SideSnap {
  const charging = p.pcards.filter((e) => isEquipObj(e) && e.zone === "active").map((e) => (isEquipObj(e) ? e.name : ""));
  return {
    name: p.name,
    leader: p.leader ? snapUnit(p, p.leader) : null,
    active: p.active.map((u) => snapUnit(p, u)),
    passive: p.passive.map((u) => snapUnit(p, u)),
    charging,
    events: [...p.events],
    hand: p.hand.length,
    deck: p.deck.length,
    lockout: p.lockout,
  };
}

interface MutableFrame extends Omit<Frame, "A" | "B"> {
  A?: SideSnap;
  B?: SideSnap;
}

export function makeRecorder(): Recorder & { frames: Frame[] } {
  const frames: Frame[] = [];
  let cur: MutableFrame | null = null;
  return {
    frames,
    log(s: string) {
      if (cur) cur.lines.push(s);
    },
    beginPly(t: number, turn: number, actor: string) {
      cur = { t, turn, actor, lines: [], result: null };
    },
    endPly(a: Player, b: Player) {
      if (!cur) return;
      cur.A = snap(a);
      cur.B = snap(b);
      cur.result = null;
      frames.push(cur as Frame);
      cur = null;
    },
    snapshot(a: Player, b: Player, turn: number, result: { w: string; why: string } | null) {
      if (result === null && !cur) {
        frames.push({
          t: 0,
          turn: 1,
          actor: null,
          lines: ["Game start — each player shuffles a 30-card deck and draws 5."],
          A: snap(a),
          B: snap(b),
          result: null,
        });
        return;
      }
      if (!cur) cur = { t: turn * 2, turn, actor: null, lines: [], result: null };
      cur.A = snap(a);
      cur.B = snap(b);
      cur.result = result;
      frames.push(cur as Frame);
      cur = null;
    },
  };
}

/** Convenience: play one recorded game and return its frames. */
export function recordGame(deckA: string[], deckB: string[], seed: number): Frame[] {
  const rec = makeRecorder();
  game(deckA, deckB, mulberry32(seed >>> 0), greedyPolicy, rec);
  return rec.frames;
}
