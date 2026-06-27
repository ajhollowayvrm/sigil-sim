// Collection tab — three sub-views: your Cards, the Deck Builder, and the Store
// (pack store lands in Phase 5; placeholder for now).

import { useMemo, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { getCardInfo } from "../../data/loadCards";
import { CollectionCard } from "./CollectionCard";
import { DeckBuilder } from "./DeckBuilder";
import { PackStore } from "./PackStore";

type Sub = "cards" | "decks" | "store";

export function CollectionTab({ onCard }: { onCard: (n: string) => void }) {
  const [sub, setSub] = useState<Sub>("cards");

  return (
    <div>
      <div className="subtabs">
        {(["cards", "decks", "store"] as const).map((s) => (
          <button key={s} className={sub === s ? "" : "ghost"} onClick={() => setSub(s)}>
            {s === "cards" ? "Cards" : s === "decks" ? "Deck Builder" : "Store"}
          </button>
        ))}
      </div>
      {sub === "cards" && <CardsGrid onCard={onCard} />}
      {sub === "decks" && <DeckBuilder onCard={onCard} />}
      {sub === "store" && <PackStore />}
    </div>
  );
}

function CardsGrid({ onCard }: { onCard: (n: string) => void }) {
  const auth = useAuth();
  const owned = auth.profile?.collection ?? {};
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const f = search.toLowerCase();
    const g: Record<string, string[]> = { Characters: [], Items: [], Events: [] };
    for (const name of Object.keys(owned)) {
      if (owned[name] <= 0) continue;
      if (f && !name.toLowerCase().includes(f)) continue;
      const kind = getCardInfo(name)?.kind ?? "character";
      g[kind === "character" ? "Characters" : kind === "item" ? "Items" : "Events"].push(name);
    }
    for (const k of Object.keys(g)) g[k].sort();
    return g;
  }, [owned, search]);

  const total = Object.entries(owned).reduce((s, [, n]) => s + n, 0);
  const distinct = Object.values(owned).filter((n) => n > 0).length;

  if (distinct === 0) {
    return <div className="banner">Your collection is empty — head to the Store to open a pack.</div>;
  }

  return (
    <div>
      <div className="bar">
        <input
          type="text"
          placeholder={`search your ${distinct} card types (${total} cards)…`}
          style={{ flex: 1 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {(["Characters", "Items", "Events"] as const).map((g) =>
        groups[g].length ? (
          <div className="poolgroup" key={g}>
            <h4>
              {g} ({groups[g].length})
            </h4>
            <div className="colgrid">
              {groups[g].map((n) => (
                <CollectionCard key={n} name={n} owned={owned[n]} onClick={() => onCard(n)} />
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
