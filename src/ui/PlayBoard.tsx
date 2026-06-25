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

// One-line "how to act" hint per decision kind — the board is the primary surface.
const KIND_HINT: Record<string, string> = {
  main: "Drag a hand card onto a zone to play it, or onto one of your bodies to equip / transform it.",
  transform: "Drag a hand form onto the body it upgrades.",
  combat: "Drag one of your bodies onto an enemy to attack.",
  elevate: "Drag a body onto your Leader slot to crown it.",
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
  orient,
  onCard,
  dnd,
}: {
  s: SideSnap;
  hand: string[];
  name: string;
  acting: boolean;
  hideHand: boolean;
  orient: "top" | "bottom";
  onCard: (n: string) => void;
  dnd?: DnD;
}) {
  const drag = dnd?.drag ?? null;
  const k = dnd?.kind;
  const mine = !!dnd?.isActor;

  const handDraggable = mine && (k === "main" || k === "transform") && !hideHand;
  const zoneCanDrop = (zone: "active" | "passive") => mine && drag?.kind === "hand" && !!dnd?.canZone(zone);
  const unitCanDrop = (cname: string, idx: number) => {
    if (!drag || !dnd) return false;
    const sideOk = drag.kind === "hand" ? mine : !mine; // play-on-friendly vs attack-enemy
    return sideOk && dnd.canUnit(cname, idx);
  };
  const leaderZoneCanDrop = mine && drag?.kind === "unit" && k === "elevate" && !!dnd?.canLeader();
  // Combat: only active bodies + the Leader attack. Elevation: from active or passive.
  const zoneDraggable = (zone: "active" | "passive" | "leader") =>
    mine && ((k === "combat" && zone !== "passive") || (k === "elevate" && zone !== "leader"));

  const unitDnd = (u: { name: string }, idx: number, zone: "active" | "passive" | "leader") => ({
    draggable: zoneDraggable(zone),
    onDragStart: () => dnd?.startUnit(u.name, idx),
    onDragEnd: () => dnd?.end(),
    canDrop: unitCanDrop(u.name, idx),
    onDrop: () => dnd?.dropUnit(u.name, idx),
  });

  const zoneRow = (zone: "active" | "passive") => {
    const units = zone === "active" ? s.active : s.passive;
    const evs = s.events.filter((e) => e.zone === zone);
    const hot = zoneCanDrop(zone);
    return (
      <div
        className={`zone${hot ? " candrop" : ""}`}
        onDragOver={hot ? (e) => e.preventDefault() : undefined}
        onDrop={hot ? (e) => { e.preventDefault(); dnd?.dropZone(zone); } : undefined}
      >
        <div className="zlabel">{zone}</div>
        <div className="slots">
          {units.length === 0 && evs.length === 0 && <div className="empty">empty</div>}
          {units.map((u, i) => (
            <Card key={i} u={u} onCard={onCard} dnd={unitDnd(u, i, zone)} />
          ))}
          {evs.map((e) => (
            <EventToken key={e.name} name={e.name} onCard={onCard} />
          ))}
        </div>
      </div>
    );
  };

  const leaderCol = (
    <div
      className={`leadercol${leaderZoneCanDrop ? " candrop" : ""}`}
      onDragOver={leaderZoneCanDrop ? (e) => e.preventDefault() : undefined}
      onDrop={leaderZoneCanDrop ? (e) => { e.preventDefault(); dnd?.dropLeader(); } : undefined}
    >
      <div className="zlabel">Leader</div>
      <Card u={s.leader} onCard={onCard} dnd={s.leader ? unitDnd(s.leader, -1, "leader") : undefined} />
    </div>
  );

  const handTray = (
    <div className="handtray">
      {hand.length === 0 && <div className="empty">empty hand</div>}
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
  );

  const head = (
    <div className="sidehead">
      <span className="deckname">
        {orient === "top" ? "🤖 " : "🧑 "}
        {name} <span className="meta">({s.name})</span>
      </span>
      {acting && <span className="ev">to act</span>}
      {s.lockout && <span className="lock">LEADERLESS</span>}
      <span className="counts">
        hand {s.hand} · deck {s.deck}
      </span>
    </div>
  );

  // Active zone sits nearest the centre line on both sides; the hand is on the outer edge.
  const band = (
    <div className="band">
      {leaderCol}
      <div className="zonecol">
        {orient === "top" ? (
          <>
            {zoneRow("passive")}
            {zoneRow("active")}
          </>
        ) : (
          <>
            {zoneRow("active")}
            {zoneRow("passive")}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={`boardside ${orient}${acting ? " acting" : ""}`}>
      {orient === "top" ? (
        <>
          {head}
          {handTray}
          {band}
        </>
      ) : (
        <>
          {band}
          {handTray}
          {head}
        </>
      )}
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
  const [showAll, setShowAll] = useState(false);
  const askRef = useRef<((k: string) => void) | null>(null);

  const ask = useCallback(
    (d: Decision) =>
      new Promise<string>((res) => {
        setPending(d);
        setShowAll(false);
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
  const turnLabel = view ? `Turn ${view.turn}${view.actor ? ` · ${view.actor === "A" ? a : b}'s turn` : ""}` : "—";

  // The human always sits at the bottom; the opponent faces them from the top. In a
  // hotseat (both human) or a watch (both AI) we default deck A to the bottom seat.
  const you: "A" | "B" = ctrlB === "human" && ctrlA === "ai" ? "B" : "A";
  const foe: "A" | "B" = you === "A" ? "B" : "A";

  const terminal = pending?.terminalKey;
  const plays = pending?.options.filter((o) => o.key !== terminal) ?? [];
  const terminalLabel = pending?.options.find((o) => o.key === terminal)?.label;

  const renderSide = (letter: "A" | "B", orient: "top" | "bottom") => {
    if (!view) return null;
    const ctl = letter === "A" ? ctrlA : ctrlB;
    const opp = letter === "A" ? ctrlB : ctrlA;
    return (
      <Side
        s={letter === "A" ? view.A : view.B}
        hand={letter === "A" ? view.handA : view.handB}
        name={letter === "A" ? a : b}
        acting={view.actor === letter}
        hideHand={ctl === "ai" && opp === "human"}
        orient={orient}
        onCard={onCard}
        dnd={dndFor(letter)}
      />
    );
  };

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

      {/* Drag-first action bar: the board is how you act; this just states the phase,
          carries the terminal action (end phase / end combat / decline), and tucks the
          full legal-move list behind a toggle as a fallback. */}
      {pending && (
        <div className="actionbar">
          <span className={`dkind ${pending.kind}`}>{KIND_LABEL[pending.kind]}</span>
          <span className="ahint">{KIND_HINT[pending.kind]}</span>
          <span className="spacer" />
          {terminal && (
            <button className="optbtn" onClick={() => choose(terminal)}>
              {terminalLabel}
            </button>
          )}
          {plays.length > 0 && (
            <button className="optbtn ghost" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Hide moves" : `All moves (${plays.length})`}
            </button>
          )}
          {showAll && (
            <div className="allmoves">
              {plays.map((o) => (
                <button key={o.key} className="optbtn" onClick={() => choose(o.key)}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view && (
        <div className="table">
          {renderSide(foe, "top")}
          <div className="centerline">
            <span>⚔</span>
          </div>
          {renderSide(you, "bottom")}
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
          Pick a deck for each side and choose <b>You</b> or <b>AI</b>. By default you play <b>Deck A</b> from the bottom
          of the table against the <b>AI</b> across from you. Every play, transform, attack, and elevation is your call —
          nothing auto-attacks unless a card forces it. <b>Drag</b> a hand card up onto a zone to play it, onto one of your
          bodies to equip/transform it, or drag one of your bodies onto an enemy to attack. The phase bar carries “end
          phase”, and <b>All moves</b> lists every legal action if you’d rather click. The AI’s hand stays hidden. Press{" "}
          <b>Start game</b>.
        </p>
      )}
    </div>
  );
}
