import { useEffect, useRef, useState } from "react";
import { DECK_NAMES, DECKS } from "../data/decks";
import { recordGame, type Frame, type SideSnap } from "../sim/recorder";
import { Card } from "./Card";
import { EventsPanel } from "./EventsPanel";
import { Log } from "./Log";

const WHY: Record<string, string> = {
  leader: "Leader defeated",
  deckout: "opponent decked out",
  noleader: "failed to elevate a Leader by turn 6",
  wiped: "all characters eliminated",
  timeout: "turn cap reached — draw",
};

function Side({ s, deckName, acting, onCard }: { s: SideSnap; deckName: string; acting: boolean; onCard: (n: string) => void }) {
  return (
    <div className={`side${acting ? " acting" : ""}`}>
      <div className="sidehead">
        <span className="deckname">{deckName}</span>
        {acting && <span className="ev">acting</span>}
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
          {s.active.length === 0 && s.charging.length === 0 && <div className="empty">empty</div>}
          {s.active.map((u, i) => (
            <Card key={i} u={u} onCard={onCard} />
          ))}
          {s.charging.map((c, i) => (
            <div className="card charging" key={`c${i}`}>
              <div className="cn">{c}</div>
              <div className="chg">⚙ charging</div>
            </div>
          ))}
        </div>
      </div>
      <div className="zone">
        <div className="zlabel">Passive</div>
        <div className="slots">
          {s.passive.length === 0 && <div className="empty">empty</div>}
          {s.passive.map((u, i) => (
            <Card key={i} u={u} onCard={onCard} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WatchBoard({ onCard }: { onCard: (n: string) => void }) {
  const [a, setA] = useState("War");
  const [b, setB] = useState("Loyalist");
  const [seed, setSeed] = useState(1);
  const [lockSeed, setLockSeed] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function newGame(useSeed = seed) {
    const s = lockSeed ? useSeed : Math.floor(Math.random() * 1e9);
    if (!lockSeed) setSeed(s);
    setAuto(false);
    setFrames(recordGame(DECKS[a](), DECKS[b](), s));
    setI(0);
  }

  // initial game + whenever decks change
  useEffect(() => {
    setAuto(false);
    setFrames(recordGame(DECKS[a](), DECKS[b](), lockSeed ? seed : 1));
    setI(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!auto) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      setI((prev) => {
        if (prev >= frames.length - 1) {
          setAuto(false);
          return prev;
        }
        return prev + 1;
      });
    }, Math.max(120, speed));
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [auto, speed, frames.length]);

  const fr = frames[i];
  const go = (n: number) => {
    setAuto(false);
    setI(Math.max(0, Math.min(frames.length - 1, n)));
  };

  return (
    <div>
      <div className="bar">
        <label>Deck A</label>
        <select value={a} onChange={(e) => setA(e.target.value)}>
          {DECK_NAMES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <span className="vs">vs</span>
        <label>Deck B</label>
        <select value={b} onChange={(e) => setB(e.target.value)}>
          {DECK_NAMES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <label>seed</label>
        <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 1)} />
        <label>
          <input type="checkbox" checked={lockSeed} onChange={(e) => setLockSeed(e.target.checked)} /> lock
        </label>
        <button onClick={() => newGame()}>New game</button>
        <button className="ghost" onClick={() => setAuto((x) => !x)}>
          {auto ? "⏸ Pause" : "▶▶ Auto"}
        </button>
        <label>speed</label>
        <input type="number" value={speed} step={100} onChange={(e) => setSpeed(parseInt(e.target.value) || 600)} />
        <span className="meta">ms</span>
      </div>

      <div className="bar playback">
        <button className="ghost" onClick={() => go(0)} disabled={i === 0}>
          ⏮
        </button>
        <button className="ghost" onClick={() => go(i - 1)} disabled={i === 0}>
          ◀ prev
        </button>
        <button className="ghost" onClick={() => go(i + 1)} disabled={i >= frames.length - 1}>
          next ▶
        </button>
        <button className="ghost" onClick={() => go(frames.length - 1)} disabled={i >= frames.length - 1}>
          ⏭
        </button>
        <span className="fc">
          {fr ? `Turn ${fr.turn}${fr.actor ? ` · ${fr.actor === "A" ? a : b}'s ply` : ""}  (frame ${i + 1}/${frames.length})` : "—"}
        </span>
      </div>

      {fr?.result && (
        <div className="banner">
          🏁 {fr.result.w === "draw" ? "Draw" : `${fr.result.w === "A" ? a : b} wins`} — {WHY[fr.result.why] || fr.result.why}{" "}
          (turn {fr.turn}).
        </div>
      )}

      {fr && (
        <>
          <div className="boards">
            <Side s={fr.A} deckName={a} acting={fr.actor === "A"} onCard={onCard} />
            <Side s={fr.B} deckName={b} acting={fr.actor === "B"} onCard={onCard} />
          </div>
          <EventsPanel frame={fr} aName={a} bName={b} onCard={onCard} />
          <Log frames={frames} index={i} aName={a} bName={b} />
        </>
      )}

      <p className="note">
        The AI plays both sides with the greedy heuristic (§7). Same seed + same decks = same game. Tap any card on the board
        (or an event chip) to read its full inscription.
      </p>
    </div>
  );
}
