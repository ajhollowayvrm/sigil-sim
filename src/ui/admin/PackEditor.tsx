// Pack Editor (admin) — edit themed packs: price, cards-per-pack, and the
// weighted card pool. Saves to the backend; changes are LIVE in the Store
// immediately (the store reads packs from the backend at runtime).

import { useEffect, useMemo, useState } from "react";
import { allCardInfos } from "../../data/loadCards";
import * as api from "../../net/api";
import { ApiError, type Pack } from "../../net/api";

const newId = () => "pack-" + Date.now().toString(36);

export function PackEditor() {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [sel, setSel] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addName, setAddName] = useState("");

  const allNames = useMemo(() => allCardInfos().map((c) => c.name).sort(), []);

  useEffect(() => {
    api
      .getPacks()
      .then((r) => {
        setPacks(r.packs);
        setSel(r.packs[0]?.id ?? "");
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "could not load packs"));
  }, []);

  if (err && !packs) return <div className="autherr">{err}</div>;
  if (!packs) return <div className="banner">Loading packs…</div>;

  const pack = packs.find((p) => p.id === sel);
  const update = (patch: Partial<Pack>) => setPacks(packs.map((p) => (p.id === sel ? { ...p, ...patch } : p)));

  function addPack() {
    const p: Pack = { id: newId(), name: "New Pack", theme: "custom", price: 100, cardsPerPack: 5, cardPool: [] };
    setPacks([...packs!, p]);
    setSel(p.id);
  }
  function delPack() {
    const next = packs!.filter((p) => p.id !== sel);
    setPacks(next);
    setSel(next[0]?.id ?? "");
  }
  function addCard() {
    if (!pack || !addName) return;
    if (pack.cardPool.some((c) => c.cardId === addName)) return;
    update({ cardPool: [...pack.cardPool, { cardId: addName, weight: 4 }] });
    setAddName("");
  }
  function setWeight(cardId: string, weight: number) {
    if (!pack) return;
    update({ cardPool: pack.cardPool.map((c) => (c.cardId === cardId ? { ...c, weight } : c)) });
  }
  function removeCard(cardId: string) {
    if (!pack) return;
    update({ cardPool: pack.cardPool.filter((c) => c.cardId !== cardId) });
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await api.putPacks(packs!);
      setMsg("Saved — live in the Store now.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="bar">
        <label>Pack</label>
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          {packs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.cardPool.length})
            </option>
          ))}
        </select>
        <button className="ghost" onClick={addPack}>
          + New
        </button>
        {pack && (
          <button className="ghost" onClick={delPack}>
            Delete
          </button>
        )}
        <span className="spacer" style={{ flex: 1 }} />
        <button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save all packs"}
        </button>
      </div>
      {err && <div className="autherr">{err}</div>}
      {msg && <div className="db-ok">{msg}</div>}

      {pack && (
        <div className="editcols">
          <div className="editfields">
            <label className="authfield">
              <span>Name</span>
              <input value={pack.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <label className="authfield">
              <span>Theme id</span>
              <input value={pack.theme} onChange={(e) => update({ theme: e.target.value })} />
            </label>
            <label className="authfield">
              <span>Price (coins)</span>
              <input type="number" value={pack.price} onChange={(e) => update({ price: parseInt(e.target.value) || 0 })} />
            </label>
            <label className="authfield">
              <span>Cards per pack</span>
              <input
                type="number"
                value={pack.cardsPerPack}
                onChange={(e) => update({ cardsPerPack: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </label>
            <div className="authfield">
              <span>Add card to pool</span>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  list="allcards"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="card name…"
                  style={{ flex: 1 }}
                />
                <button className="ghost" onClick={addCard}>
                  Add
                </button>
              </div>
              <datalist id="allcards">
                {allNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="editpool">
            <div className="zlabel">Card pool ({pack.cardPool.length}) — weight = relative pull odds</div>
            <div className="poolrows">
              {pack.cardPool.length === 0 && <div className="empty">empty pool</div>}
              {pack.cardPool.map((c) => (
                <div key={c.cardId} className="poolrow">
                  <span className="poolrow-name">{c.cardId}</span>
                  <input
                    type="number"
                    value={c.weight}
                    min={1}
                    onChange={(e) => setWeight(c.cardId, Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: 60 }}
                  />
                  <button className="inspectbtn ghost" onClick={() => removeCard(c.cardId)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
