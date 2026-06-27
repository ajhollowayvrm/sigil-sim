import { useEffect, useMemo, useState } from "react";
import { AuthProvider, useAuth } from "../state/AuthContext";
import { InscriptionModal } from "./InscriptionModal";
import { LoginTab } from "./auth/LoginTab";
import { CollectionTab } from "./collection/CollectionTab";
import { PlayTab } from "./play/PlayTab";
import { AdminTab } from "./admin/AdminTab";

type Tab = "play" | "collection" | "login" | "admin";

export function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [card, setCard] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Which tabs are visible for the current auth state.
  const tabs = useMemo(() => {
    const list: { id: Tab; label: string }[] = [];
    if (auth.signedIn) {
      list.push({ id: "play", label: "⚔ Play" });
      list.push({ id: "collection", label: "🗃 Collection" });
    }
    list.push({ id: "login", label: auth.signedIn ? "👤 Account" : "🔑 Log-In" });
    if (auth.isAdmin) list.push({ id: "admin", label: "🛠 Admin" });
    return list;
  }, [auth.signedIn, auth.isAdmin]);

  // Land on Play once signed in; fall back to Log-In when the current tab is hidden.
  useEffect(() => {
    if (!auth.ready) return;
    if (auth.signedIn && tab === "login") setTab("play");
    if (!tabs.some((t) => t.id === tab)) setTab(auth.signedIn ? "play" : "login");
  }, [auth.ready, auth.signedIn, tabs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="wrap">
      <header>
        <h1>Sigil</h1>
        <span className="sub">campaign · build a deck, beat the field, open packs</span>
        {auth.signedIn && (
          <span className="coinpill" title="coins">
            🪙 {auth.profile?.coins ?? 0}
          </span>
        )}
      </header>

      <div className="tabs">
        {tabs.map((t) => (
          <div key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {!auth.ready ? (
        <div className="banner">Loading…</div>
      ) : (
        <>
          {tab === "play" && auth.signedIn && <PlayTab onCard={setCard} />}
          {tab === "collection" && auth.signedIn && <CollectionTab onCard={setCard} />}
          {tab === "login" && <LoginTab />}
          {tab === "admin" && auth.isAdmin && <AdminTab onCard={setCard} />}
        </>
      )}

      {card && <InscriptionModal name={card} onClose={() => setCard(null)} onCard={setCard} />}
    </div>
  );
}
