// Admin tab — Card Editor, Pack Editor, and the Lab (the old sim/dev surfaces).
// Gated to admin accounts by the shell.

import { useState } from "react";
import { WatchBoard } from "../WatchBoard";
import { BatchPanel } from "../BatchPanel";
import { PlayBoard } from "../PlayBoard";
import { CardEditor } from "./CardEditor";
import { PackEditor } from "./PackEditor";

type Sub = "cards" | "packs" | "lab";

export function AdminTab({ onCard }: { onCard: (n: string) => void }) {
  const [sub, setSub] = useState<Sub>("cards");
  return (
    <div>
      <div className="subtabs">
        {(["cards", "packs", "lab"] as const).map((s) => (
          <button key={s} className={sub === s ? "" : "ghost"} onClick={() => setSub(s)}>
            {s === "cards" ? "Card Editor" : s === "packs" ? "Pack Editor" : "Lab"}
          </button>
        ))}
      </div>
      {sub === "cards" && <CardEditor onCard={onCard} />}
      {sub === "packs" && <PackEditor />}
      {sub === "lab" && <Lab onCard={onCard} />}
    </div>
  );
}

function Lab({ onCard }: { onCard: (n: string) => void }) {
  const [tool, setTool] = useState<"watch" | "batch" | "play">("watch");
  return (
    <div>
      <p className="mut">
        Balance &amp; dev tools (admin only). These drive the bundled engine, not your account.
      </p>
      <div className="subtabs">
        {(["watch", "batch", "play"] as const).map((t) => (
          <button key={t} className={tool === t ? "" : "ghost"} onClick={() => setTool(t)}>
            {t === "watch" ? "▶ Watch a game" : t === "batch" ? "📊 Batch" : "🎮 Play & record"}
          </button>
        ))}
      </div>
      {tool === "watch" && <WatchBoard onCard={onCard} />}
      {tool === "batch" && <BatchPanel />}
      {tool === "play" && <PlayBoard onCard={onCard} />}
    </div>
  );
}
