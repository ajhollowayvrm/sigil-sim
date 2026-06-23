import type { Frame } from "../sim/recorder";

function cls(s: string): string {
  if (/KO'd|burns out/.test(s)) return "ko";
  if (/^[AB]:/.test(s)) return "ply";
  return "";
}

export function Log({ frames, index, aName, bName }: { frames: Frame[]; index: number; aName: string; bName: string }) {
  const fr = frames[index];
  const actorName = (a: string | null) => (a === "A" ? aName : a === "B" ? bName : "");
  const cur = fr ? (fr.lines.length ? fr.lines : ["(no actions)"]) : [];

  const full: { text: string; head?: boolean }[] = [];
  for (let k = 0; k <= index; k++) {
    const f = frames[k];
    if (!f) continue;
    full.push({ text: f.actor ? `▸ Turn ${f.turn} — ${actorName(f.actor)}` : `▸ ${f.lines[0] ?? "Game start"}`, head: true });
    for (const l of f.lines) full.push({ text: l });
  }

  return (
    <div className="logwrap">
      <div className="logbox">
        <h3>This step</h3>
        <div className="loglines">
          {cur.map((l, i) => (
            <div key={i} className={cls(l)}>
              {l}
            </div>
          ))}
        </div>
      </div>
      <div className="logbox">
        <h3>Full play-by-play</h3>
        <div className="loglines">
          {full.map((l, i) => (
            <div key={i} className={l.head ? "ply" : cls(l.text)}>
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
