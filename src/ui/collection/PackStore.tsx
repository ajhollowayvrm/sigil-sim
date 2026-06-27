// Store — buy & open themed packs. Pack RNG and coin/collection mutation happen
// server-side (/openpack); we reveal what came back and sync the profile.

import { useEffect, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import * as api from "../../net/api";
import { ApiError, type Pack } from "../../net/api";
import { CollectionCard } from "./CollectionCard";

export function PackStore() {
  const auth = useAuth();
  const coins = auth.profile?.coins ?? 0;
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ pack: string; cards: string[] } | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getPacks()
      .then((r) => alive && setPacks(r.packs))
      .catch((e) => alive && setErr(e instanceof ApiError ? e.message : "could not load packs"));
    return () => {
      alive = false;
    };
  }, []);

  async function open(p: Pack) {
    setErr(null);
    setBusy(p.id);
    try {
      const res = await api.openPack(p.id);
      auth.patchProfile({ coins: res.coins, collection: res.collection });
      setReveal({ pack: p.name, cards: res.opened });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "could not open pack");
    } finally {
      setBusy(null);
    }
  }

  if (err && !packs) return <div className="autherr">{err}</div>;
  if (!packs) return <div className="banner">Loading packs…</div>;

  return (
    <div>
      {err && <div className="autherr">{err}</div>}
      <div className="packgrid">
        {packs.map((p) => (
          <div key={p.id} className="packcard">
            <div className="packname">{p.name}</div>
            <div className="packmeta">
              {p.cardsPerPack} cards · {p.cardPool.length} possible
            </div>
            <div className="packprice">🪙 {p.price}</div>
            <button onClick={() => open(p)} disabled={busy !== null || coins < p.price}>
              {busy === p.id ? "Opening…" : coins < p.price ? "Not enough coins" : "Open pack"}
            </button>
          </div>
        ))}
      </div>

      {reveal && (
        <div className="modal-bg" onClick={() => setReveal(null)}>
          <div className="reveal" onClick={(e) => e.stopPropagation()}>
            <h3>{reveal.pack}</h3>
            <div className="colgrid">
              {reveal.cards.map((n, i) => (
                <CollectionCard key={i} name={n} />
              ))}
            </div>
            <button onClick={() => setReveal(null)}>Add to collection</button>
          </div>
        </div>
      )}
    </div>
  );
}
