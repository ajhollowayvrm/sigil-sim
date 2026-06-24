import { useCallback, useRef, useState } from "react";
import { DECK_NAMES, DECKS } from "../data/decks";
import { playInteractive, type Controller, type Decision, type View } from "../sim/interactive";
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

function Side({
  s,
  hand,
  name,
  acting,
  hideHand,
  onCard,
}: {
  s: SideSnap;
  hand: string[];
  name: string;
  acting: boolean;
  hideHand: boolean;
  onCard: (n: string) => void;
}) {
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
      <div className="zone leaderzone">
        <div className="zlabel">Leader</div>
        <div className="slots">
          <Card u={s.leader} onCard={onCard} />
        </div>
      </div>
      <div className="zone">
        <div className="zlabel">Active</div>
        <div className="slots">
          {s.active.length === 0 && s.events.every((e) => e.zone !== "active") && <div className="empty">empty</div>}
          {s.active.map((u, i) => (
            <Card key={i} u={u} onCard={onCard} />
          ))}
          {s.events.filter((e) => e.zone === "active").map((e) => (
            <EventToken key={e.name} name={e.name} onCard={onCard} />
          ))}
        </div>
      </div>
      <div className="zone">
        <div className="zlabel">Passive</div>
        <div className="slots">
          {s.passive.length === 0 && s.events.every((e) => e.zone !== "passive") && <div className="empty">empty</div>}
          {s.passive.map((u, i) => (
            <Card key={i} u={u} onCard={onCard} />
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
                <span className="handcard" key={i} onClick={() => onCard(c)}>
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

  async function start() {
    const s = lockSeed ? seed : Math.floor(Math.random() * 1e9);
    if (!lockSeed) setSeed(s);
    setRecording(null);
    setView(null);
    setPending(null);
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
          <Side s={view.A} hand={view.handA} name={a} acting={view.actor === "A"} hideHand={ctrlA === "ai" && ctrlB === "human"} onCard={onCard} />
          <Side s={view.B} hand={view.handB} name={b} acting={view.actor === "B"} hideHand={ctrlB === "ai" && ctrlA === "human"} onCard={onCard} />
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
          card forces it. The AI's hand stays hidden. Chains auto-resolve with the engine's targeting; you direct the solo
          attacks. Set both to <b>You</b> for a full-information hotseat, or both to <b>AI</b> to watch. Every move is
          recorded; when the game ends you can download the JSON. Press <b>Start game</b>.
        </p>
      )}
    </div>
  );
}
