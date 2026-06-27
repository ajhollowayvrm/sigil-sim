// Deck builder — assemble decks from owned cards (max 3 copies, 20–40 cards),
// persisted to the profile. Left = your collection (click to add); right = the
// deck (click to remove).

import { useMemo, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { getCardInfo } from "../../data/loadCards";
import { ApiError, type Deck } from "../../net/api";
import { MAX_COPIES, MAX_DECK, MIN_DECK, countCopies, deckProblems } from "../../game/deckRules";
import { CollectionCard } from "./CollectionCard";

const newId = () => "deck-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

export function DeckBuilder({ onCard }: { onCard: (n: string) => void }) {
  const auth = useAuth();
  const owned = auth.profile?.collection ?? {};
  const decks = auth.profile?.decks ?? [];

  const [editId, setEditId] = useState<string | null>(decks[0]?.id ?? null);
  const [name, setName] = useState<string>(decks[0]?.name ?? "");
  const [cards, setCards] = useState<string[]>(decks[0]?.cards ?? []);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const counts = useMemo(() => countCopies(cards), [cards]);
  const problems = useMemo(() => deckProblems(cards, owned), [cards, owned]);

  function select(id: string | null) {
    const d = decks.find((x) => x.id === id);
    setEditId(id);
    setName(d?.name ?? "");
    setCards(d?.cards ?? []);
    setDirty(false);
    setErr(null);
  }
  function newDeck() {
    setEditId(newId());
    setName("New Deck");
    setCards([]);
    setDirty(true);
    setErr(null);
  }
  function add(n: string) {
    const cap = Math.min(owned[n] ?? 0, MAX_COPIES);
    if ((counts[n] ?? 0) >= cap) return;
    if (cards.length >= MAX_DECK) return;
    setCards([...cards, n]);
    setDirty(true);
  }
  function remove(n: string) {
    const i = cards.indexOf(n);
    if (i < 0) return;
    const c = cards.slice();
    c.splice(i, 1);
    setCards(c);
    setDirty(true);
  }

  async function persist(next: Deck[], keep: string | null) {
    setSaving(true);
    setErr(null);
    try {
      await auth.saveDecks(next);
      setDirty(false);
      if (keep === null) select(next[0]?.id ?? null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }
  function save() {
    if (!editId) return;
    const deck: Deck = { id: editId, name: name.trim() || "Untitled", cards };
    const exists = decks.some((d) => d.id === editId);
    persist(exists ? decks.map((d) => (d.id === editId ? deck : d)) : [...decks, deck], editId);
  }
  function del() {
    if (!editId) return;
    persist(
      decks.filter((d) => d.id !== editId),
      null,
    );
  }

  // collection pool (owned cards), searchable, sorted by kind then name
  const f = search.toLowerCase();
  const pool = Object.keys(owned)
    .filter((n) => owned[n] > 0 && (!f || n.toLowerCase().includes(f)))
    .sort((a, b) => {
      const ka = getCardInfo(a)?.kind ?? "z";
      const kb = getCardInfo(b)?.kind ?? "z";
      return ka === kb ? a.localeCompare(b) : ka.localeCompare(kb);
    });

  const deckGroups = useMemo(() => {
    const g: { name: string; n: number }[] = [];
    for (const n of Object.keys(counts).sort()) g.push({ name: n, n: counts[n] });
    return g;
  }, [counts]);

  return (
    <div className="deckbuilder">
      <div className="db-bar">
        <select value={editId ?? ""} onChange={(e) => select(e.target.value || null)}>
          {decks.length === 0 && <option value="">— no decks yet —</option>}
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.cards.length})
            </option>
          ))}
          {editId && !decks.some((d) => d.id === editId) && <option value={editId}>{name} (unsaved)</option>}
        </select>
        <button className="ghost" onClick={newDeck}>
          + New deck
        </button>
        {editId && (
          <button className="ghost" onClick={del} disabled={saving}>
            Delete
          </button>
        )}
      </div>

      {!editId ? (
        <div className="banner">Create a deck to get started.</div>
      ) : (
        <div className="db-cols">
          <div className="db-pool">
            <div className="bar">
              <input
                type="text"
                placeholder="search your collection…"
                style={{ flex: 1 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="colgrid">
              {pool.map((n) => {
                const cap = Math.min(owned[n], MAX_COPIES);
                return (
                  <CollectionCard
                    key={n}
                    name={n}
                    owned={owned[n]}
                    inDeck={counts[n] ?? 0}
                    dimmed={(counts[n] ?? 0) >= cap}
                    onClick={() => add(n)}
                    onInspect={() => onCard(n)}
                  />
                );
              })}
              {pool.length === 0 && <div className="empty">No cards — open a pack in the Store.</div>}
            </div>
          </div>

          <div className="db-deck">
            <input
              className="deckname-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder="Deck name"
            />
            <div className={`db-count${cards.length < MIN_DECK || cards.length > MAX_DECK ? " bad" : " good"}`}>
              {cards.length} / {MAX_DECK} cards{" "}
              <span className="mut">
                (min {MIN_DECK}, max {MAX_COPIES} copies each)
              </span>
            </div>
            <div className="db-list">
              {deckGroups.length === 0 && <div className="empty">Empty — click cards on the left to add them.</div>}
              {deckGroups.map(({ name: n, n: count }) => (
                <div key={n} className="db-row" onClick={() => remove(n)} title="click to remove one">
                  <span className="db-x">×{count}</span>
                  <span className="db-name">{n}</span>
                  <button
                    className="inspectbtn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCard(n);
                    }}
                  >
                    ?
                  </button>
                </div>
              ))}
            </div>
            {problems.length > 0 && (
              <div className="db-problems">
                {problems.map((p, i) => (
                  <div key={i}>⚠ {p}</div>
                ))}
              </div>
            )}
            {problems.length === 0 && cards.length > 0 && <div className="db-ok">✓ Legal deck</div>}
            {err && <div className="autherr">{err}</div>}
            <button onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save deck"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
