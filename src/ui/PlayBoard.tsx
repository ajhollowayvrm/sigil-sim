import { useCallback, useRef, useState } from "react";
import { DECK_NAMES, DECKS } from "../data/decks";
import { playInteractive, type Controller, type Decision, type View } from "../sim/interactive";
import type { Phase } from "../sim/record";
import type { GameRecording } from "../sim/record";
import { saveRecording } from "../sim/save";
import type { SideSnap } from "../sim/recorder";
import { Card, EventToken } from "./Card";

const WHY: Record<string, string> = {
  leader: "Leader defeated",
  deckout: "decked out",
  noleader: "no Leader by turn 6",
  wiped: "all characters eliminated",
  timeout: "turn cap reached — draw",
};

const KIND_LABEL: Record<string, string> = {
  main: "Main phase",
  transform: "Transformation",
  combat: "Combat",
  elevate: "Elevation",
};

// What the human is currently dragging.
type Drag = { kind: "hand"; card: string } | { kind: "unit"; name: string; idx: number };

// Everything a Side needs to wire drag-and-drop. Undefined ⇒ inert (watch / non-acting side).
interface DnD {
  drag: Drag | null;
  kind?: Phase; // the pending decision kind
  isActor: boolean; // this side is the one to act
  startHand: (card: string) => void;
  startUnit: (name: string, idx: number) => void;
  end: () => void;
  dropZone: (zone: "active" | "passive") => void;
  dropUnit: (name: string, idx: number) => void;
  dropLeader: () => void;
  // precise legality of a drop, derived from the real option keys (drives highlights)
  canZone: (zone: "active" | "passive") => boolean;
  canUnit: (name: string, idx: number) => boolean;
  canLeader: () => boolean;
}

function Side({
  s,
  hand,
  name,
  acting,
  hideHand,
  onCard,
  dnd,
}: {
  s: SideSnap;
  hand: string[];
  name: string;
  acting: boolean;
  hideHand: boolean;
  onCard: (n: string) => void;
  dnd?: DnD;
}) {
  const drag = dnd?.drag ?? null;
  const k = dnd?.kind;
  const mine = !!dnd?.isActor;

  // ---- what's draggable on this side ----
  const handDraggable = mine && (k === "main" || k === "transform") && !hideHand;

  // ---- precise drop highlights (only truly-legal targets light up) ----
  // Zones accept your hand card only on your own side. Friendly bodies accept a
  // hand card (equip/transform/morph/heal); enemy bodies accept an attacker.
  const zoneCanDrop = (zone: "active" | "passive") => mine && drag?.kind === "hand" && !!dnd?.canZone(zone);
  const unitCanDrop = (name: string, idx: number) => {
    if (!drag || !dnd) return false;
    const sideOk = drag.kind === "hand" ? mine : !mine; // play-on-friendly vs attack-enemy
    return sideOk && dnd.canUnit(name, idx);
  };
  const leaderZoneCanDrop = mine && drag?.kind === "unit" && k === "elevate" && !!dnd?.canLeader();

  // Combat: only active bodies + the Leader can attack (not the passive zone).
  // Elevation: a body may be crowned from either the active or passive zone.
  const zoneDraggable = (zone: "active" | "passive" | "leader") =>
    mine && ((k === "combat" && zone !== "passive") || (k === "elevate" && zone !== "leader"));

  const unitDnd = (u: { name: string }, idx: number, zone: "active" | "passive" | "leader") => ({
    draggable: zoneDraggable(zone),
    onDragStart: () => dnd?.startUnit(u.name, idx),
    onDragEnd: () => dnd?.end(),
    canDrop: unitCanDrop(u.name, idx),
    onDrop: () => dnd?.dropUnit(u.name, idx),
  });

  return (
    <div className={`side${acting ? " acting" : ""}`}>
      <div className="sidehead">
        <span className="deckname">
          {name} <span className="meta">({s.name})</span>
        </span>
        {acting && <span className="ev">to act</span>}
        {s.lockout && <span className="lock">LEADERLESS</span>}
        <span className="counts">
          hand {s.hand} · deck {s.deck}
        </span>
      </div>
      <div
        className={`zone leaderzone${leaderZoneCanDrop ? " candrop" : ""}`}
        onDragOver={leaderZoneCanDrop ? (e) => e.preventDefault() : undefined}
        onDrop={leaderZoneCanDrop ? (e) => { e.preventDefault(); dnd?.dropLeader(); } : undefined}
      >
        <div className="zlabel">Leader</div>
        <div className="slots">
          <Card u={s.leader} onCard={onCard} dnd={s.leader ? unitDnd(s.leader, -1, "leader") : undefined} />
        </div>
      </div>
      <div
        className={`zone${zoneCanDrop("active") ? " candrop" : ""}`}
        onDragOver={zoneCanDrop("active") ? (e) => e.preventDefault() : undefined}
        onDrop={zoneCanDrop("active") ? (e) => { e.preventDefault(); dnd?.dropZone("active"); } : undefined}
      >
        <div className="zlabel">Active</div>
        <div className="slots">
          {s.active.length === 0 && s.events.every((e) => e.zone !== "active") && <div className="empty">empty</div>}
          {s.active.map((u, i) => (
            <Card key={i} u={u} onCard={onCard} dnd={unitDnd(u, i, "active")} />
          ))}
          {s.events.filter((e) => e.zone === "active").map((e) => (
            <EventToken key={e.name} name={e.name} onCard={onCard} />
          ))}
        </div>
      </div>
      <div
        className={`zone${zoneCanDrop("passive") ? " candrop" : ""}`}
        onDragOver={zoneCanDrop("passive") ? (e) => e.preventDefault() : undefined}
        onDrop={zoneCanDrop("passive") ? (e) => { e.preventDefault(); dnd?.dropZone("passive"); } : undefined}
      >
        <div className="zlabel">Passive</div>
        <div className="slots">
          {s.passive.length === 0 && s.events.every((e) => e.zone !== "passive") && <div className="empty">empty</div>}
          {s.passive.map((u, i) => (
            <Card key={i} u={u} onCard={onCard} dnd={unitDnd(u, i, "passive")} />
          ))}
          {s.events.filter((e) => e.zone === "passive").map((e) => (
            <EventToken key={e.name} name={e.name} onCard={onCard} />
          ))}
        </div>
      </div>
      <div className="zone">
        <div className="zlabel">Hand</div>
        <div className="hand">
          {hand.length === 0 && <div className="empty">empty</div>}
          {hideHand
            ? hand.map((_, i) => (
                <span className="handcard facedown" key={i}>
                  🂠
                </span>
              ))
            : hand.map((c, i) => (
                <span
                  className={`handcard${handDraggable ? " draggable" : ""}`}
                  key={i}
                  draggable={handDraggable}
                  onDragStart={handDraggable ? () => dnd?.startHand(c) : undefined}
                  onDragEnd={handDraggable ? () => dnd?.end() : undefined}
                  onClick={() => onCard(c)}
                >
                  {c}
                </span>
              ))}
        </div>
      </div>
    </div>
  );
}

export function PlayBoard({ onCard }: { onCard: (n: string) => void }) {
  const [a, setA] = useState("War");
  const [b, setB] = useState("Loyalist");
  const [ctrlA, setCtrlA] = useState<Controller>("human");
  const [ctrlB, setCtrlB] = useState<Controller>("ai");
  const [seed, setSeed] = useState(1);
  const [lockSeed, setLockSeed] = useState(false);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [pending, setPending] = useState<Decision | null>(null);
  const [recording, setRecording] = useState<GameRecording | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const askRef = useRef<((k: string) => void) | null>(null);

  const ask = useCallback(
    (d: Decision) =>
      new Promise<string>((res) => {
        setPending(d);
        askRef.current = (k) => {
          askRef.current = null;
          setPending(null);
          res(k);
        };
      }),
    [],
  );

  const onView = useCallback((v: View) => setView(v), []);
  const choose = (key: string) => askRef.current?.(key);

  // Lets the human watch the AI's plays/attacks land one beat at a time.
  const pace = useCallback(() => new Promise<void>((res) => setTimeout(res, 650)), []);

  // ---- drag-and-drop → option key resolution ----
  // Each gesture is matched against the pending decision's real option keys, so a
  // drop only fires a legal move; anything ambiguous still falls back to the buttons.
  const commit = (key: string) => {
    choose(key);
    setDrag(null);
  };
  const optKeys = () => pending?.options.map((o) => o.key) ?? [];
  const pick = (...cands: string[]) => {
    const keys = new Set(optKeys());
    for (const c of cands) if (keys.has(c)) return commit(c), true;
    return false;
  };

  // Predicates: is this drop legal right now? Derived from the real option keys so
  // a target only highlights when dropping there would fire an actual move.
  const attackByName = (name: string) =>
    optKeys().find((x) => {
      const m = x.match(/^attack:(.+)#(-?\d+)>(.+)#(-?\d+)$/);
      return m && drag?.kind === "unit" && m[1] === drag.name && m[3] === name;
    });
  const canZone = (zone: "active" | "passive") => {
    if (!drag || drag.kind !== "hand") return false;
    const keys = new Set(optKeys());
    return keys.has(`play:${drag.card}:${zone}`) || keys.has(`event:${drag.card}`) || keys.has(`onplay:${drag.card}`);
  };
  const canUnit = (name: string, idx: number) => {
    if (!drag) return false;
    if (drag.kind === "hand") {
      const c = drag.card;
      const keys = new Set(optKeys());
      return keys.has(`equip:${c}>${name}`) || keys.has(`transform:${name}>${c}`) || keys.has(`morph:${name}>${c}`) || keys.has(`onplay:${c}>${name}`);
    }
    return new Set(optKeys()).has(`attack:${drag.name}#${drag.idx}>${name}#${idx}`) || !!attackByName(name);
  };
  const canLeader = () =>
    !!drag &&
    drag.kind === "unit" &&
    optKeys().some((x) => {
      const m = x.match(/^elevate:(.+)#\d+$/);
      return m && m[1] === drag.name;
    });

  const dropZone = (zone: "active" | "passive") => {
    if (!drag || drag.kind !== "hand") return;
    const c = drag.card;
    // Only zone-appropriate plays resolve here; targeted cards (heal/tutor) are
    // dropped on their target or chosen via the buttons, never auto-guessed.
    if (!pick(`play:${c}:${zone}`, `event:${c}`, `onplay:${c}`)) setDrag(null);
  };

  const dropUnit = (name: string, idx: number) => {
    if (!drag) return;
    if (drag.kind === "hand") {
      const c = drag.card;
      if (!pick(`equip:${c}>${name}`, `transform:${name}>${c}`, `morph:${name}>${c}`, `onplay:${c}>${name}`)) setDrag(null);
    } else {
      if (pick(`attack:${drag.name}#${drag.idx}>${name}#${idx}`)) return;
      // Fallback: match by attacker+target name if the index reconstruction misses.
      const k = attackByName(name);
      if (k) commit(k);
      else setDrag(null);
    }
  };

  const dropLeader = () => {
    if (!drag || drag.kind !== "unit") return;
    const k = optKeys().find((x) => {
      const m = x.match(/^elevate:(.+)#\d+$/);
      return m && m[1] === drag.name;
    });
    if (k) commit(k);
    else setDrag(null);
  };

  const dndFor = (sideName: "A" | "B"): DnD | undefined => {
    if (!pending) return undefined;
    return {
      drag,
      kind: pending.kind,
      isActor: pending.actor === sideName,
      startHand: (card) => setDrag({ kind: "hand", card }),
      startUnit: (name, idx) => setDrag({ kind: "unit", name, idx }),
      end: () => setDrag(null),
      dropZone,
      dropUnit,
      dropLeader,
      canZone,
      canUnit,
      canLeader,
    };
  };

  async function start() {
    const s = lockSeed ? seed : Math.floor(Math.random() * 1e9);
    if (!lockSeed) setSeed(s);
    setRecording(null);
    setView(null);
    setPending(null);
    setDrag(null);
    setRunning(true);
    const rec = await playInteractive(DECKS[a](), DECKS[b](), a, b, s, ask, onView, { A: ctrlA, B: ctrlB }, pace);
    rec.meta.startedAt = new Date().toISOString();
    setRecording(rec);
    setPending(null);
    setRunning(false);
  }

  const result = view?.result ?? null;
  const turnLabel = view ? `Turn ${view.turn}${view.actor ? ` · ${view.actor === "A" ? a : b}'s decision` : ""}` : "—";

  // Group the option buttons so a long combat list stays scannable.
  const terminal = pending?.terminalKey;
  const plays = pending?.options.filter((o) => o.key !== terminal) ?? [];

  return (
    <div>
      <div className="bar">
        <label>Deck A</label>
        <select value={a} onChange={(e) => setA(e.target.value)} disabled={running}>
          {DECK_NAMES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <select value={ctrlA} onChange={(e) => setCtrlA(e.target.value as Controller)} disabled={running}>
          <option value="human">You</option>
          <option value="ai">AI</option>
        </select>
        <span className="vs">vs</span>
        <label>Deck B</label>
        <select value={b} onChange={(e) => setB(e.target.value)} disabled={running}>
          {DECK_NAMES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <select value={ctrlB} onChange={(e) => setCtrlB(e.target.value as Controller)} disabled={running}>
          <option value="human">You</option>
          <option value="ai">AI</option>
        </select>
        <label>seed</label>
        <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 1)} disabled={running} />
        <label>
          <input type="checkbox" checked={lockSeed} onChange={(e) => setLockSeed(e.target.checked)} disabled={running} /> lock
        </label>
        <button onClick={start} disabled={running}>
          {running ? "Game in progress…" : "Start game"}
        </button>
        <span className="fc">{turnLabel}</span>
      </div>

      {result && (
        <div className="banner">
          🏁 {result.winner === "draw" ? "Draw" : `${result.winner === "A" ? a : b} wins`} — {WHY[result.why] || result.why}{" "}
          (turn {result.turn}).
          {recording && (
            <span className="saverow">
              <button onClick={() => saveRecording(recording)}>⬇ Download recording</button>
              <button
                className="ghost"
                onClick={() => navigator.clipboard?.writeText(JSON.stringify(recording, null, 2))}
              >
                Copy JSON
              </button>
              <span className="meta">{recording.moves.length} moves recorded</span>
            </span>
          )}
        </div>
      )}

      {pending && (
        <div className="decision">
          <div className="dprompt">
            <span className={`dkind ${pending.kind}`}>{KIND_LABEL[pending.kind]}</span>
            {pending.prompt}
            <span className="draghint">— or drag cards on the board</span>
          </div>
          <div className="options">
            {plays.map((o) => (
              <button key={o.key} className="optbtn" onClick={() => choose(o.key)}>
                {o.label}
              </button>
            ))}
            {terminal && (
              <button className="optbtn ghost" onClick={() => choose(terminal)}>
                {pending.options.find((o) => o.key === terminal)?.label}
              </button>
            )}
          </div>
        </div>
      )}

      {view && (
        <div className="boards">
          <Side
            s={view.A}
            hand={view.handA}
            name={a}
            acting={view.actor === "A"}
            hideHand={ctrlA === "ai" && ctrlB === "human"}
            onCard={onCard}
            dnd={dndFor("A")}
          />
          <Side
            s={view.B}
            hand={view.handB}
            name={b}
            acting={view.actor === "B"}
            hideHand={ctrlB === "ai" && ctrlA === "human"}
            onCard={onCard}
            dnd={dndFor("B")}
          />
        </div>
      )}

      {view && (
        <div className="playlog">
          <div className="zlabel">Play-by-play</div>
          <div className="loglines">
            {view.log.slice(-60).map((l, i) => (
              <div key={i} className={l.startsWith("  ") ? "li sub" : "li"}>
                {l}
              </div>
            ))}
            {view.log.length === 0 && <div className="empty">no moves yet</div>}
          </div>
        </div>
      )}

      {!view && !running && (
        <p className="note">
          Pick a deck for each side and choose <b>You</b> or <b>AI</b> to control it. By default you play <b>Deck A</b>{" "}
          against the <b>AI</b> — every play, transform, attack, and elevation is your call; nothing auto-attacks unless a
          card forces it. <b>Drag</b> a hand card onto a zone to play it, onto a friendly body to equip/transform it, or
          drag one of your bodies onto an enemy to attack — or just use the buttons. The AI's hand stays hidden. Set both
          to <b>You</b> for a hotseat, or both to <b>AI</b> to watch. Every move is recorded. Press <b>Start game</b>.
        </p>
      )}
    </div>
  );
}
