// A static card tile (not a runtime Unit) for the collection grid and deck
// builder. Pulls printed data from the engine's bundled card DB (loadCards), so
// what you see here is exactly what the engine plays.

import { getCard, getCardInfo } from "../../data/loadCards";

export function elemClass(elem?: string): string {
  if (!elem) return "";
  const e = elem.toLowerCase();
  if (e.includes("dark") && e.includes("light")) return "dl";
  for (const k of ["fire", "water", "earth", "wind", "light", "dark"]) if (e.includes(k)) return k;
  return "";
}

export function CollectionCard({
  name,
  owned,
  inDeck,
  onClick,
  onInspect,
  dimmed,
}: {
  name: string;
  owned?: number; // copies owned (collection view)
  inDeck?: number; // copies currently in the deck being built
  onClick?: () => void; // primary action (add / remove)
  onInspect?: () => void; // open inscription
  dimmed?: boolean; // e.g. all copies already used
}) {
  const info = getCardInfo(name);
  const ch = getCard(name); // character stats, if a character
  const elem = info?.elem || ch?.elem;
  const kind = info?.kind ?? "character";
  const tier = info?.tier || (ch && Number.isFinite(ch.tier) ? `T${ch.tier}` : "");

  return (
    <div className={`colcard ${elemClass(elem)}${dimmed ? " dim" : ""}`} onClick={onClick} title={info?.text || ""}>
      <div className="colcard-top">
        <span className="cn">{name}</span>
        {tier && <span className="tier">{tier}</span>}
      </div>
      <div className="colcard-meta">
        <span className="kindtag">{kind}</span>
        {elem && <span className="el">{elem}</span>}
      </div>
      {kind === "character" && ch && Number.isFinite(ch.atk) && (
        <div className="colcard-stats">
          <span className="atk">⚔ {ch.atk}</span>
          <span className="def">🛡 {ch.deff}</span>
          <span className="hp">❤ {ch.hp}</span>
        </div>
      )}
      <div className="colcard-foot">
        {owned !== undefined && (
          <span className="owncount">
            {inDeck ? `${inDeck} / ` : ""}
            {owned}
          </span>
        )}
        {onInspect && (
          <button
            className="inspectbtn ghost"
            onClick={(e) => {
              e.stopPropagation();
              onInspect();
            }}
          >
            ?
          </button>
        )}
      </div>
    </div>
  );
}
