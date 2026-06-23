import { useEffect, useState } from "react";
import { BatchPanel } from "./BatchPanel";
import { CardPool } from "./CardPool";
import { InscriptionModal } from "./InscriptionModal";
import { PlayBoard } from "./PlayBoard";
import { WatchBoard } from "./WatchBoard";

type Tab = "watch" | "play" | "batch" | "cards";

const TABS: { id: Tab; label: string }[] = [
  { id: "watch", label: "▶ Watch a game" },
  { id: "play", label: "🎮 Play & record" },
  { id: "batch", label: "📊 Batch simulation" },
  { id: "cards", label: "📖 Cards & rules" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("watch");
  const [card, setCard] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="wrap">
      <header>
        <h1>Sigil — Simulator</h1>
        <span className="sub">rules-faithful engine · Ruleset v0.7 + Combat &amp; Effects v0.3 (+ §5 amendments)</span>
      </header>

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === "watch" && <WatchBoard onCard={setCard} />}
      {tab === "play" && <PlayBoard onCard={setCard} />}
      {tab === "batch" && <BatchPanel />}
      {tab === "cards" && <CardPool onCard={setCard} />}

      {card && <InscriptionModal name={card} onClose={() => setCard(null)} />}
    </div>
  );
}
