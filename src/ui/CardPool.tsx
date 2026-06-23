import { useMemo, useState } from "react";
import { allCardInfos, getCardInfo, isCharacter, isItem } from "../data/loadCards";
import { DECKS, DECK_NAMES } from "../data/decks";

function Coverage() {
  return (
    <div className="deckpanel">
      <div className="cov">
        <b>Simulation coverage</b> — what the engine resolves automatically (it plays both sides with a greedy AI, so effects
        requiring a human choice are approximated):
        <br />
        <br />
        <b>Rules — modeled:</b>{" "}
        <span className="ok">
          slot economy · 2-turn opening &amp; no early combat · elevation from active/passive · Leader slot, attack, protection
          &amp; tier bonus · Leader transformation restrictions · elemental wheel + Light/Dark · transformation
          (upgrade/sidegrade/branch, destination-in-hand, item/kill/war/event gates) · one transform per turn · chains (size,
          affiliation, formula, zone, element amp, AoE, Keeper size reduction) · T1-only hard-cast + play permissions · play to
          active/passive · equipment link-on-play, play-conditions, discard-on-bearer-KO · world-state wars hit both sides ·
          War-Torn cost/immunity/attack-through · Metamorphosis · deck-out, wipe, no-Leader, Leader-kill wins
        </span>
        <br />
        <br />
        <b>Card effects — modeled:</b>{" "}
        <span className="ok">
          stat auras (Honathan, Mages Guild, Goblin Captain, Crusade, Horde Frenzy, Rally to War) · entry triggers (Mage Arlia,
          Embermaw, Lumenkit, Hollowed Stag) · on-KO draws (King's Blade, Horde Frenzy) · heal-over-time (Regrow, The Long Road)
          · Blood Money kill-scaling · The Silent +20 vs high-ATK · element-conditional equips · cannot-become-War-Torn · Holy
          War capture · The Broken March War-Torn chain
        </span>
        <br />
        <br />
        <b>Approximated / not yet modeled:</b>{" "}
        <span className="approx">
          on-entry effects outside the sample decks · Max-HP modifiers (Plague / Medical Advancement cap-only math) · redirect
          (Me for You, At Her Side) · negate-and-destroy &amp; immunities (Magical Shield, Protection of the Divine, Feliefnir) —
          no destroy/manipulation cards exist to trigger them · The Ascended variable stats · deck-search (Call of the Channel,
          Seeker) · mulligan &amp; hand-size (open rules questions)
        </span>{" "}
        <span className="no">· love-road marriage cards (stats TBD — not simulatable yet)</span>
      </div>
    </div>
  );
}

function DeckLists({ onCard }: { onCard: (n: string) => void }) {
  return (
    <div className="deckpanel">
      <details>
        <summary>Deck lists (what's in each)</summary>
        <div className="decklist">
          {DECK_NAMES.map((name) => {
            const counts: Record<string, number> = {};
            DECKS[name]().forEach((c) => (counts[c] = (counts[c] || 0) + 1));
            const cat = (c: string) => (isCharacter(c) ? "Characters" : isItem(c) ? "Items / Equipment" : "Events");
            const groups: Record<string, string[]> = { Characters: [], "Items / Equipment": [], Events: [] };
            Object.keys(counts)
              .sort()
              .forEach((c) => groups[cat(c)].push(`${c}${counts[c] > 1 ? ` ×${counts[c]}` : ""}`));
            return (
              <div key={name}>
                <b>{name}</b>
                {(["Characters", "Items / Equipment", "Events"] as const).map((g) =>
                  groups[g].length ? (
                    <div key={g}>
                      <div className="dt">{g}</div>
                      <ul>
                        {groups[g].map((x) => {
                          const base = x.replace(/ ×\d+$/, "");
                          return (
                            <li key={x} className="poolchip" style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }} onClick={() => onCard(base)}>
                              {x}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

export function CardPool({ onCard }: { onCard: (n: string) => void }) {
  const [filter, setFilter] = useState("");
  const all = useMemo(() => allCardInfos(), []);
  const f = filter.toLowerCase();
  const groups: Record<string, string[]> = { Characters: [], Items: [], Events: [] };
  for (const ci of all) {
    if (f && !ci.name.toLowerCase().includes(f)) continue;
    const g = ci.kind === "character" ? "Characters" : ci.kind === "item" ? "Items" : "Events";
    groups[g].push(ci.name);
  }
  const total = all.length;

  return (
    <div>
      <Coverage />
      <DeckLists onCard={onCard} />
      <div className="bar">
        <input
          type="text"
          placeholder={`search the card pool (${total} cards)…`}
          style={{ flex: 1 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {(["Characters", "Items", "Events"] as const).map((g) =>
        groups[g].length ? (
          <div className="poolgroup" key={g}>
            <h4>
              {g} ({groups[g].length})
            </h4>
            <div className="poolchips">
              {groups[g]
                .sort()
                .map((n) => (
                  <span className="poolchip" key={n} onClick={() => onCard(n)} title={getCardInfo(n)?.tier ?? ""}>
                    {n}
                  </span>
                ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
