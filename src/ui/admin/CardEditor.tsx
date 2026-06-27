// Card Editor (admin) — edit the canonical card DB stored in the backend.
//
// IMPORTANT: the game ENGINE plays from the bundled src/data/cards.json (fixed at
// deploy time), so edits here change the canon but only reach gameplay after a
// redeploy: run `npm run pull-cards` to write the backend DB into cards.json,
// then push (Pages rebuilds). Pack pools (Pack Editor) ARE live immediately.

import { useEffect, useMemo, useState } from "react";
import * as api from "../../net/api";
import { ApiError, type CardDb } from "../../net/api";

type Group = "characters" | "items" | "events";

export function CardEditor({ onCard }: { onCard: (n: string) => void }) {
  const [db, setDb] = useState<CardDb | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ group: Group; name: string } | null>(null);
  const [buf, setBuf] = useState("");
  const [bufErr, setBufErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCards()
      .then((d) => setDb(d))
      .catch((e) => setErr(e instanceof ApiError ? e.message : "could not load card DB"));
  }, []);

  const list = useMemo(() => {
    if (!db) return [] as { group: Group; name: string }[];
    const f = search.toLowerCase();
    const out: { group: Group; name: string }[] = [];
    for (const group of ["characters", "items", "events"] as Group[]) {
      for (const c of db[group] as any[]) {
        const name = (c.Name || "").trim();
        if (name && (!f || name.toLowerCase().includes(f))) out.push({ group, name });
      }
    }
    return out;
  }, [db, search]);

  function select(group: Group, name: string) {
    if (!db) return;
    const card = (db[group] as any[]).find((c) => (c.Name || "").trim() === name);
    setSelected({ group, name });
    setBuf(JSON.stringify(card, null, 2));
    setBufErr(null);
  }

  function applyCard() {
    if (!db || !selected) return;
    let parsed: any;
    try {
      parsed = JSON.parse(buf);
    } catch (e) {
      setBufErr("invalid JSON: " + (e as Error).message);
      return;
    }
    if ((parsed.Name || "").trim() !== selected.name) {
      setBufErr("changing Name isn't supported here (it's the card id) — edit other fields only");
      return;
    }
    const arr = (db[selected.group] as any[]).map((c) => ((c.Name || "").trim() === selected.name ? parsed : c));
    setDb({ ...db, [selected.group]: arr });
    setBufErr(null);
    setMsg("card staged — remember to Save the DB");
  }

  async function save() {
    if (!db) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await api.putCards(db);
      setMsg(`Saved card DB (v${r.updatedAt}). Run \`npm run pull-cards\` + redeploy to apply to gameplay.`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  if (err && !db) return <div className="autherr">{err}</div>;
  if (!db) return <div className="banner">Loading card DB…</div>;

  return (
    <div>
      <div className="banner" style={{ borderColor: "var(--line)" }}>
        Editing the backend card canon. Pack pools are live; <b>card stats reach gameplay after</b>{" "}
        <code>npm run pull-cards</code> + a redeploy.
      </div>
      <div className="bar">
        <input
          type="text"
          placeholder={`search ${list.length} cards…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        {err && <span className="autherr" style={{ margin: 0 }}>{err}</span>}
        <button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save card DB"}
        </button>
      </div>
      {msg && <div className="db-ok">{msg}</div>}

      <div className="editcols">
        <div className="cardlist">
          {list.slice(0, 300).map(({ group, name }) => (
            <div
              key={group + name}
              className={`cardlist-row${selected?.name === name ? " on" : ""}`}
              onClick={() => select(group, name)}
            >
              <span className="kindtag">{group[0]}</span>
              {name}
            </div>
          ))}
        </div>

        <div className="editfields">
          {!selected ? (
            <div className="empty">Select a card to edit its fields.</div>
          ) : (
            <>
              <div className="zlabel">
                {selected.name}{" "}
                <button className="inspectbtn ghost" onClick={() => onCard(selected.name)}>
                  inspect
                </button>
              </div>
              <textarea className="jsoneditor" value={buf} onChange={(e) => setBuf(e.target.value)} spellCheck={false} />
              {bufErr && <div className="autherr">{bufErr}</div>}
              <button onClick={applyCard}>Stage card changes</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
