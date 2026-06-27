// BoardGame — the reusable interactive board: drives one game via playInteractive
// (human and/or AI), renders both sides with drag-and-drop + tap controls, the
// phase action bar, and the play-by-play log. Chrome around it (deck pickers,
// campaign matchmaking, rewards) lives in the wrappers (PlayBoard / PlayTab).

import { useCallback, useEffect, useRef, useState } from "react";
import { playInteractive, type Controller, type Decision, type View } from "../../sim/interactive";
import type { Phase } from "../../sim/record";
import type { GameRecording } from "../../sim/record";
import type { SideSnap } from "../../sim/recorder";
import { Card, EventToken } from "../Card";

export interface GameResultInfo {
  winner: string; // "A" | "B" | "draw"
  why: string;
  turn: number;
}

const KIND_LABEL: Record<string, string> = {
  main: "Main phase",
  transform: "Transformation",
  combat: "Combat",
  elevate: "Elevation",
};
const KIND_HINT: Record<string, string> = {
  main: "Drag or tap a hand card, then a zone to play it — or a body to equip / transform it.",
  transform: "Drag or tap a hand form, then the body it upgrades.",
  combat: "Drag or tap one of your bodies, then an enemy to attack it.",
  elevate: "Drag or tap a body, then your Leader slot to crown it.",
};

type Drag = { kind: "hand"; card: string } | { kind: "unit"; name: string; idx: number };

interface DnD {
  drag: Drag | null;
  selected: Drag | null;
  kind?: Phase;
  isActor: boolean;
  startHand: (card: string) => void;
  startUnit: (name: string, idx: number) => void;
  end: () => void;
  selectHand: (card: string) => void;
  selectUnit: (name: string, idx: number) => void;
  dropZone: (zone: "active" | "passive") => void;
  dropUnit: (name: string, idx: number) => void;
  dropLeader: () => void;
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
  const sel = dnd?.selected ?? null;
  const armed = drag ?? sel;
  const k = dnd?.kind;
  const mine = !!dnd?.isActor;

  const handSource = mine && (k === "main" || k === "transform") && !hideHand;
  const zoneCanDrop = (zone: "active" | "passive") => mine && armed?.kind === "hand" && !!dnd?.canZone(zone);
  const unitCanDrop = (cname: string, idx: number) => {
    if (!armed || !dnd) return false;
    const sideOk = armed.kind === "hand" ? mine : !mine;
    return sideOk && dnd.canUnit(cname, idx);
  };
  const leaderZoneCanDrop = mine && armed?.kind === "unit" && k === "elevate" && !!dnd?.canLeader();
  const zoneDraggable = (zone: "active" | "passive" | "leader") =>
    mine && ((k === "combat" && zone !== "passive") || (k === "elevate" && zone !== "leader"));

  const unitDnd = (u: { name: string }, idx: number, zone: "active" | "passive" | "leader") => {
    const isSource = zoneDraggable(zone);
    const isTarget = unitCanDrop(u.name, idx);
    return {
      draggable: isSource,
      onDragStart: () => dnd?.startUnit(u.name, idx),
      onDragEnd: () => dnd?.end(),
      canDrop: isTarget,
      onDrop: () => dnd?.dropUnit(u.name, idx),
      onTap: isTarget ? () => dnd?.dropUnit(u.name, idx) : isSource ? () => dnd?.selectUnit(u.name, idx) : undefined,
      selected: sel?.kind === "unit" && sel.name === u.name && sel.idx === idx,
    };
  };

  const zoneRow = (zone: "active" | "passive") => {
    const units = zone === "active" ? s.active : s.passive;
    const evs = s.events.filter((e) => e.zone === zone);
    const hot = zoneCanDrop(zone);
    return (
      <div
        className={`zone${hot ? " candrop" : ""}`}
        onDragOver={hot ? (e) => e.preventDefault() : undefined}
        onDrop={hot ? (e) => { e.preventDefault(); dnd?.dropZone(zone); } : undefined}
        onClick={hot ? () => dnd?.dropZone(zone) : undefined}
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
      onClick={leaderZoneCanDrop ? () => dnd?.dropLeader() : undefined}
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
        : hand.map((c, i) => {
            const selected = sel?.kind === "hand" && sel.card === c;
            return (
              <span
                className={`handcard${handSource ? " draggable" : ""}${selected ? " selected" : ""}`}
                key={i}
                draggable={handSource}
                onDragStart={handSource ? () => dnd?.startHand(c) : undefined}
                onDragEnd={handSource ? () => dnd?.end() : undefined}
                onClick={(e) => { e.stopPropagation(); if (handSource) dnd?.selectHand(c); else onCard(c); }}
              >
                {c}
              </span>
            );
          })}
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

export interface BoardGameProps {
  deckA: string[];
  deckB: string[];
  nameA: string;
  nameB: string;
  ctrlA: Controller;
  ctrlB: Controller;
  seed: number;
  onCard: (n: string) => void;
  /** Hide the foe's deck NAME (campaign: opponent identity is secret). */
  hideFoeName?: boolean;
  /** Called once when the game ends. */
  onResult?: (r: GameResultInfo, rec: GameRecording) => void;
}

export function BoardGame({ deckA, deckB, nameA, nameB, ctrlA, ctrlB, seed, onCard, hideFoeName, onResult }: BoardGameProps) {
  const [view, setView] = useState<View | null>(null);
  const [pending, setPending] = useState<Decision | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [sel, setSel] = useState<Drag | null>(null);
  const [showAll, setShowAll] = useState(false);
  const askRef = useRef<((k: string) => void) | null>(null);
  const aliveRef = useRef(true);
  const active = drag ?? sel;

  const ask = useCallback(
    (d: Decision) =>
      new Promise<string>((res) => {
        if (!aliveRef.current) return res(d.terminalKey ?? d.options[0]?.key ?? "");
        setPending(d);
        setShowAll(false);
        setSel(null);
        setDrag(null);
        askRef.current = (k) => {
          askRef.current = null;
          setPending(null);
          res(k);
        };
      }),
    [],
  );
  const onView = useCallback((v: View) => {
    if (aliveRef.current) setView(v);
  }, []);
  const choose = (key: string) => askRef.current?.(key);
  const pace = useCallback(() => new Promise<void>((r) => setTimeout(r, 650)), []);

  // run the game once on mount
  useEffect(() => {
    aliveRef.current = true;
    (async () => {
      const rec = await playInteractive(deckA, deckB, nameA, nameB, seed, ask, onView, { A: ctrlA, B: ctrlB }, pace);
      rec.meta.startedAt = new Date().toISOString();
      if (!aliveRef.current) return;
      setPending(null);
      const r = rec.result;
      if (r && onResult) onResult({ winner: r.winner, why: r.why, turn: r.turn }, rec);
    })();
    return () => {
      aliveRef.current = false;
      askRef.current?.(""); // unblock any pending ask so the async loop can unwind
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- dnd → option key resolution ----
  const clear = () => {
    setDrag(null);
    setSel(null);
  };
  const commit = (key: string) => {
    choose(key);
    clear();
  };
  const optKeys = () => pending?.options.map((o) => o.key) ?? [];
  const pick = (...cands: string[]) => {
    const keys = new Set(optKeys());
    for (const c of cands) if (keys.has(c)) return commit(c), true;
    return false;
  };
  const attackByName = (name: string) =>
    optKeys().find((x) => {
      const m = x.match(/^attack:(.+)#(-?\d+)>(.+)#(-?\d+)$/);
      return m && active?.kind === "unit" && m[1] === active.name && m[3] === name;
    });
  const canZone = (zone: "active" | "passive") => {
    if (!active || active.kind !== "hand") return false;
    const keys = new Set(optKeys());
    return keys.has(`play:${active.card}:${zone}`) || keys.has(`event:${active.card}`) || keys.has(`onplay:${active.card}`);
  };
  const canUnit = (name: string, idx: number) => {
    if (!active) return false;
    if (active.kind === "hand") {
      const c = active.card;
      const keys = new Set(optKeys());
      return keys.has(`equip:${c}>${name}`) || keys.has(`transform:${name}>${c}`) || keys.has(`morph:${name}>${c}`) || keys.has(`onplay:${c}>${name}`);
    }
    return new Set(optKeys()).has(`attack:${active.name}#${active.idx}>${name}#${idx}`) || !!attackByName(name);
  };
  const canLeader = () =>
    !!active &&
    active.kind === "unit" &&
    optKeys().some((x) => {
      const m = x.match(/^elevate:(.+)#\d+$/);
      return m && m[1] === active.name;
    });
  const dropZone = (zone: "active" | "passive") => {
    if (!active || active.kind !== "hand") return;
    const c = active.card;
    if (!pick(`play:${c}:${zone}`, `event:${c}`, `onplay:${c}`)) clear();
  };
  const dropUnit = (name: string, idx: number) => {
    if (!active) return;
    if (active.kind === "hand") {
      const c = active.card;
      if (!pick(`equip:${c}>${name}`, `transform:${name}>${c}`, `morph:${name}>${c}`, `onplay:${c}>${name}`)) clear();
    } else {
      if (pick(`attack:${active.name}#${active.idx}>${name}#${idx}`)) return;
      const k = attackByName(name);
      if (k) commit(k);
      else clear();
    }
  };
  const dropLeader = () => {
    if (!active || active.kind !== "unit") return;
    const k = optKeys().find((x) => {
      const m = x.match(/^elevate:(.+)#\d+$/);
      return m && m[1] === active.name;
    });
    if (k) commit(k);
    else clear();
  };
  const selectHand = (card: string) => setSel((s) => (s?.kind === "hand" && s.card === card ? null : { kind: "hand", card }));
  const selectUnit = (name: string, idx: number) =>
    setSel((s) => (s?.kind === "unit" && s.name === name && s.idx === idx ? null : { kind: "unit", name, idx }));

  const dndFor = (sideName: "A" | "B"): DnD | undefined => {
    if (!pending) return undefined;
    return {
      drag,
      selected: sel,
      kind: pending.kind,
      isActor: pending.actor === sideName,
      startHand: (card) => setDrag({ kind: "hand", card }),
      startUnit: (name, idx) => setDrag({ kind: "unit", name, idx }),
      end: () => setDrag(null),
      selectHand,
      selectUnit,
      dropZone,
      dropUnit,
      dropLeader,
      canZone,
      canUnit,
      canLeader,
    };
  };

  const you: "A" | "B" = ctrlB === "human" && ctrlA === "ai" ? "B" : "A";
  const foe: "A" | "B" = you === "A" ? "B" : "A";
  const labelFor = (letter: "A" | "B") => {
    if (hideFoeName && letter === foe) return "Unknown opponent";
    return letter === "A" ? nameA : nameB;
  };

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
        name={labelFor(letter)}
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
      {pending && (
        <div className="actionbar">
          <span className={`dkind ${pending.kind}`}>{KIND_LABEL[pending.kind]}</span>
          <span className="ahint">{KIND_HINT[pending.kind]}</span>
          {sel && (
            <span className="selchip">
              ● {sel.kind === "hand" ? sel.card : sel.name}
              <button className="cancelsel" onClick={() => setSel(null)} title="Cancel selection">
                ✕
              </button>
            </span>
          )}
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
    </div>
  );
}
