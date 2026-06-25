import type { UnitSnap } from "../sim/recorder";
import { elemClass } from "./util";

/** A persistent event sitting in one of its controller's board slots. */
export function EventToken({ name, onCard }: { name: string; onCard: (n: string) => void }) {
  return (
    <div className="card eventtok" onClick={(e) => { e.stopPropagation(); onCard(name); }} title="Persistent event (occupies a slot)">
      <div className="evtag">⚑ event</div>
      <div className="cn">{name}</div>
    </div>
  );
}

/** Optional drag-and-drop + tap wiring for a card (used by PlayBoard; inert elsewhere). */
export interface CardDnd {
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  canDrop?: boolean; // this card is a valid drop target for the current drag
  onDrop?: () => void;
  // Tap-to-target (works on touch, where HTML5 drag does not): if set, a click on
  // the card runs onTap (select-as-source or act-on-target) instead of inspecting it.
  onTap?: () => void;
  selected?: boolean; // currently armed as the tap source
}

export function Card({ u, onCard, dnd }: { u: UnitSnap | null; onCard: (name: string) => void; dnd?: CardDnd }) {
  if (!u) return <div className="empty">—</div>;
  const pct = u.maxhp > 0 ? Math.max(0, Math.min(100, (u.hp / u.maxhp) * 100)) : 0;
  return (
    <div
      className={`card ${elemClass(u.elem)} ${u.leader ? "leader" : ""} ${u.hp <= 0 ? "dead" : ""}${
        dnd?.draggable ? " draggable" : ""
      }${dnd?.canDrop ? " candrop" : ""}${dnd?.selected ? " selected" : ""}`}
      onClick={(e) => { e.stopPropagation(); if (dnd?.onTap) dnd.onTap(); else onCard(u.name); }}
      draggable={!!dnd?.draggable}
      onDragStart={dnd?.draggable ? () => dnd.onDragStart?.() : undefined}
      onDragEnd={dnd?.draggable ? () => dnd.onDragEnd?.() : undefined}
      onDragOver={dnd?.canDrop ? (e) => e.preventDefault() : undefined}
      onDrop={dnd?.canDrop ? (e) => { e.preventDefault(); dnd.onDrop?.(); } : undefined}
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
