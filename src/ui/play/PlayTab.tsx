// Play tab (campaign) — pick one of your decks, matchmake against a hidden AI
// opponent, and earn coins on a win. The match reward nonce is issued server-side
// (/match/start) and settled on game end (/reward).

import { useMemo, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { ALL_DECKS as DECKS } from "../../data/decks";
import { isLegalDeck } from "../../game/deckRules";
import * as api from "../../net/api";
import { ApiError } from "../../net/api";
import { BoardGame, type GameResultInfo } from "./BoardGame";

const WHY: Record<string, string> = {
  leader: "Leader defeated",
  deckout: "decked out",
  noleader: "no Leader by turn 6",
  wiped: "all characters eliminated",
  timeout: "turn cap reached — draw",
};

// Campaign opponent pool — the AI fields one of these archetypes at random; its
// identity stays hidden until you beat it. Each is piloted by its specialist policy.
const OPPONENTS = ["War", "Loyalist", "Goblin", "Wild", "DivineChannel", "Plague"];

interface Match {
  matchId: string;
  reward: number;
  oppName: string;
  deckCards: string[];
  seed: number;
  runKey: number;
}

export function PlayTab({ onCard }: { onCard: (n: string) => void }) {
  const auth = useAuth();
  const owned = auth.profile?.collection ?? {};
  const decks = auth.profile?.decks ?? [];
  const legalDecks = useMemo(() => decks.filter((d) => isLegalDeck(d.cards, owned)), [decks, owned]);

  const [deckId, setDeckId] = useState<string>(legalDecks[0]?.id ?? "");
  const [match, setMatch] = useState<Match | null>(null);
  const [result, setResult] = useState<GameResultInfo | null>(null);
  const [settle, setSettle] = useState<{ awarded: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);

  const deck = legalDecks.find((d) => d.id === deckId) ?? legalDecks[0];

  async function findMatch() {
    if (!deck) return;
    setErr(null);
    setResult(null);
    setSettle(null);
    setBusy(true);
    try {
      const m = await api.startMatch();
      const oppName = OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
      const nextKey = runKey + 1;
      setRunKey(nextKey);
      setMatch({
        matchId: m.matchId,
        reward: m.reward,
        oppName,
        deckCards: DECKS[oppName] ? DECKS[oppName]() : [],
        seed: Math.floor(Math.random() * 1e9),
        runKey: nextKey,
      });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "could not start a match");
    } finally {
      setBusy(false);
    }
  }

  async function onResult(r: GameResultInfo) {
    setResult(r);
    if (!match) return;
    const won = r.winner === "A";
    try {
      const res = await api.claimReward(match.matchId, won);
      auth.patchProfile({ coins: res.coins });
      setSettle({ awarded: res.awarded });
    } catch {
      /* reward already settled / expired — leave coins as-is */
    }
  }

  function done() {
    setMatch(null);
    setResult(null);
    setSettle(null);
  }

  // ---- no legal deck yet ----
  if (legalDecks.length === 0) {
    return (
      <div className="banner">
        You need a legal deck to play. Head to <b>Collection → Deck Builder</b> and build one (20–40 cards), then come back.
      </div>
    );
  }

  // ---- in a match ----
  if (match) {
    return (
      <div>
        <div className="bar">
          <span className="deckname">🧑 {deck?.name}</span>
          <span className="vs">vs</span>
          <span className="deckname">🤖 Unknown opponent</span>
          <span className="spacer" style={{ flex: 1 }} />
          {result && (
            <button className="ghost" onClick={done}>
              Leave match
            </button>
          )}
        </div>

        {result && (
          <div className="banner">
            {result.winner === "A" ? "🏆 Victory" : result.winner === "draw" ? "🤝 Draw" : "💀 Defeat"} — opponent was{" "}
            <b>{match.oppName}</b>. {WHY[result.why] || result.why} (turn {result.turn}).
            {result.winner === "A" && settle && <strong className="award"> +{settle.awarded} 🪙</strong>}
            {result.winner !== "A" && <span className="mut"> No coins this time.</span>}
            <span className="saverow">
              <button onClick={findMatch} disabled={busy}>
                {busy ? "…" : "Play again"}
              </button>
            </span>
          </div>
        )}

        <BoardGame
          key={match.runKey}
          deckA={deck!.cards}
          deckB={match.deckCards}
          nameA={deck!.name}
          nameB={match.oppName}
          ctrlA="human"
          ctrlB="ai"
          seed={match.seed}
          hideFoeName
          onCard={onCard}
          onResult={onResult}
        />
      </div>
    );
  }

  // ---- pre-match: pick a deck ----
  return (
    <div className="prematch">
      <h2>Take on the field</h2>
      <p className="mut">
        Pick a deck and face a random opponent — you won't know who until you win. Beat them to earn coins for packs.
      </p>
      <div className="bar">
        <label>Your deck</label>
        <select value={deck?.id} onChange={(e) => setDeckId(e.target.value)}>
          {legalDecks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.cards.length})
            </option>
          ))}
        </select>
        <button onClick={findMatch} disabled={busy || !deck}>
          {busy ? "Finding match…" : "⚔ Find match"}
        </button>
      </div>
      {err && <div className="autherr">{err}</div>}
      {decks.length > legalDecks.length && (
        <p className="mut">({decks.length - legalDecks.length} of your decks are not currently legal and are hidden.)</p>
      )}
    </div>
  );
}
