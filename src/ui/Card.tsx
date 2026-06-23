import type { UnitSnap } from "../sim/recorder";
import { elemClass } from "./util";

export function Card({ u, onCard }: { u: UnitSnap | null; onCard: (name: string) => void }) {
  if (!u) return <div className="empty">—</div>;
  const pct = u.maxhp > 0 ? Math.max(0, Math.min(100, (u.hp / u.maxhp) * 100)) : 0;
  return (
    <div
      className={`card ${elemClass(u.elem)} ${u.leader ? "leader" : ""} ${u.hp <= 0 ? "dead" : ""}`}
      onClick={() => onCard(u.name)}
    >
      <div className="cn">{u.name}</div>
      <div className="row">
        <span className="tier">T{u.tier}</span>
        <span className="el">{u.elem}</span>
        {u.wartorn && <span className="wt">War-Torn</span>}
        {u.kills > 0 && (
          <span className="kills">
            {u.kills} kill{u.kills > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="hpbar">
        <div className="hpfill" style={{ width: `${pct}%` }} />
        <span className="hptext">
          {u.hp} / {u.maxhp}
        </span>
      </div>
      <div className="stats">
        <span className="atk">⚔ {u.atk}</span>
        <span className="def">🛡 {u.def}</span>
      </div>
      {u.equips.length > 0 && (
        <div className="equips">
          {u.equips.map((e, i) => (
            <span
              className="eq"
              key={i}
              onClick={(ev) => {
                ev.stopPropagation();
                onCard(e);
              }}
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
