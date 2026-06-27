// PlayBoard — the dev "Play & record" surface (lives in the Admin Lab): pick any
// two decks + controllers + seed, play/watch, and download the recording. The
// interactive board itself is the shared BoardGame component.

import { useState } from "react";
import { ALL_DECK_NAMES as DECK_NAMES, ALL_DECKS as DECKS } from "../data/decks";
import type { Controller } from "../sim/interactive";
import type { GameRecording } from "../sim/record";
import { saveRecording } from "../sim/save";
import { BoardGame, type GameResultInfo } from "./play/BoardGame";

const WHY: Record<string, string> = {
  leader: "Leader defeated",
  deckout: "decked out",
  noleader: "no Leader by turn 6",
  wiped: "all characters eliminated",
  timeout: "turn cap reached — draw",
};

export function PlayBoard({ onCard }: { onCard: (n: string) => void }) {
  const [a, setA] = useState("War");
  const [b, setB] = useState("Loyalist");
  const [ctrlA, setCtrlA] = useState<Controller>("human");
  const [ctrlB, setCtrlB] = useState<Controller>("ai");
  const [seed, setSeed] = useState(1);
  const [lockSeed, setLockSeed] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [activeSeed, setActiveSeed] = useState<number | null>(null);
  const [recording, setRecording] = useState<GameRecording | null>(null);
  const [result, setResult] = useState<GameResultInfo | null>(null);

  const running = activeSeed !== null && result === null;

  function start() {
    const s = lockSeed ? seed : Math.floor(Math.random() * 1e9);
    if (!lockSeed) setSeed(s);
    setRecording(null);
    setResult(null);
    setActiveSeed(s);
    setRunKey((k) => k + 1);
  }

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
      </div>

      {result && (
        <div className="banner">
          🏁 {result.winner === "draw" ? "Draw" : `${result.winner === "A" ? a : b} wins`} — {WHY[result.why] || result.why}{" "}
          (turn {result.turn}).
          {recording && (
            <span className="saverow">
              <button onClick={() => saveRecording(recording)}>⬇ Download recording</button>
              <button className="ghost" onClick={() => navigator.clipboard?.writeText(JSON.stringify(recording, null, 2))}>
                Copy JSON
              </button>
              <span className="meta">{recording.moves.length} moves recorded</span>
            </span>
          )}
        </div>
      )}

      {activeSeed !== null && (
        <BoardGame
          key={runKey}
          deckA={DECKS[a]()}
          deckB={DECKS[b]()}
          nameA={a}
          nameB={b}
          ctrlA={ctrlA}
          ctrlB={ctrlB}
          seed={activeSeed}
          onCard={onCard}
          onResult={(r, rec) => {
            setResult(r);
            setRecording(rec);
          }}
        />
      )}

      {activeSeed === null && (
        <p className="note">
          Dev sandbox: pick a deck and <b>You</b>/<b>AI</b> for each side, then <b>Start game</b>. Drag a card (or tap
          source → target) to act; the AI's hand stays hidden. Download the recording for AI tuning.
        </p>
      )}
    </div>
  );
}
