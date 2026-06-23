import { useState } from "react";
import { DECK_NAMES } from "../data/decks";
import { runMatch, type MatchStats } from "../sim/batch";

const WHY: Record<string, string> = {
  leader: "Leader defeated",
  deckout: "deck-out",
  noleader: "no Leader by turn 6",
  wiped: "wiped",
  timeout: "turn-cap draw",
};
const COL: Record<string, string> = { War: "#e8552f", Loyalist: "#e8c43a", Goblin: "#5fa83f", Wild: "#9a5fe0" };

function Block({ a, b, n, r }: { a: string; b: string; n: number; r: MatchStats }) {
  const tot = Object.values(r.wins).reduce((x, y) => x + y, 0) || 1;
  const wa = r.wins[a] || 0;
  const wb = r.wins[b] || 0;
  const dr = r.wins.draw || 0;
  const pa = (wa / tot) * 100;
  const pb = (wb / tot) * 100;
  const pd = (dr / tot) * 100;
  const ends = Object.entries(r.ends)
    .sort((x, y) => y[1] - x[1])
    .map(([k, v]) => `${WHY[k] || k}: ${((v / tot) * 100).toFixed(0)}%`)
    .join(" · ");
  return (
    <div className="matchblock">
      <h3>
        {a} <span className="vs">vs</span> {b} <span className="meta">({n} games)</span>
      </h3>
      <div className="winbar">
        <span style={{ width: `${pa}%`, background: COL[a] || "#888" }}>{pa >= 8 ? `${a} ${pa.toFixed(0)}%` : ""}</span>
        {pd > 0 && <span style={{ width: `${pd}%`, background: "#555", color: "#ddd" }}>{pd >= 8 ? `draw ${pd.toFixed(0)}%` : ""}</span>}
        <span style={{ width: `${pb}%`, background: COL[b] || "#888" }}>{pb >= 8 ? `${b} ${pb.toFixed(0)}%` : ""}</span>
      </div>
      <table>
        <tbody>
          <tr>
            <th>Deck</th>
            <th>Wins</th>
            <th>Win rate</th>
          </tr>
          <tr>
            <td>{a}</td>
            <td>{wa}</td>
            <td>
              <b>{pa.toFixed(1)}%</b>
            </td>
          </tr>
          <tr>
            <td>{b}</td>
            <td>{wb}</td>
            <td>
              <b>{pb.toFixed(1)}%</b>
            </td>
          </tr>
          {dr > 0 && (
            <tr>
              <td>draw</td>
              <td>{dr}</td>
              <td>{pd.toFixed(1)}%</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="meta">
        avg length {r.avg.toFixed(1)} turns · median {r.median} · decided by — {ends}
      </p>
    </div>
  );
}

export function BatchPanel() {
  const [n, setN] = useState(400);
  const [seed, setSeed] = useState(7);
  const [cA, setCA] = useState("War");
  const [cB, setCB] = useState("Goblin");
  const [blocks, setBlocks] = useState<{ a: string; b: string; n: number; r: MatchStats }[]>([]);
  const [running, setRunning] = useState(false);

  function runAll() {
    setRunning(true);
    setTimeout(() => {
      const matchups: [string, string][] = [
        ["War", "Loyalist"],
        ["War", "Goblin"],
        ["Loyalist", "Goblin"],
      ];
      setBlocks(matchups.map(([a, b]) => ({ a, b, n, r: runMatch(a, b, n, seed) })));
      setRunning(false);
    }, 20);
  }

  function runCustom() {
    setRunning(true);
    setTimeout(() => {
      setBlocks((prev) => [{ a: cA, b: cB, n, r: runMatch(cA, cB, n, seed) }, ...prev]);
      setRunning(false);
    }, 20);
  }

  return (
    <div>
      <div className="bar">
        <label>games / matchup</label>
        <input type="number" value={n} step={100} onChange={(e) => setN(Math.max(20, parseInt(e.target.value) || 400))} />
        <label>seed</label>
        <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 7)} />
        <button onClick={runAll}>Run 3 canonical matchups</button>
      </div>
      <div className="bar">
        <label>Custom</label>
        <select value={cA} onChange={(e) => setCA(e.target.value)}>
          {DECK_NAMES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="vs">vs</span>
        <select value={cB} onChange={(e) => setCB(e.target.value)}>
          {DECK_NAMES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button className="ghost" onClick={runCustom}>
          Run custom
        </button>
      </div>
      {running && <p className="meta">running…</p>}
      {blocks.map((bl, i) => (
        <Block key={i} {...bl} />
      ))}
      <p className="note">
        Win-rates use a seeded RNG (reproducible, but a different stream than sigil_sim.py — expect small variance, not identical
        numbers). "len" is game length in turns; the end-reason breakdown shows how games are decided.
      </p>
    </div>
  );
}
