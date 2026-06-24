// Headless smoke test for the human-vs-AI interactive driver.
// Runs three controller configs and asserts each game completes with a result.
import { playInteractive, type Decision } from "../src/sim/interactive";
import { DECKS } from "../src/data/decks";

const noop = () => {};

// A trivial "human": pick the first non-terminal option a few times per decision,
// then bail to the terminal option. Caps total picks to guarantee termination.
function makeAnswerer() {
  let budget = 500;
  return async (d: Decision): Promise<string> => {
    if (budget-- <= 0) return d.terminalKey ?? d.options[0].key;
    const plays = d.options.filter((o) => o.key !== d.terminalKey);
    // Elevate: always crown someone. Main/combat: take an action ~half the time.
    if (d.kind === "elevate") return plays[0]?.key ?? d.terminalKey ?? d.options[0].key;
    return (budget % 2 === 0 && plays.length ? plays[0].key : d.terminalKey) ?? d.options[0].key;
  };
}

async function run(label: string, A: "human" | "ai", B: "human" | "ai") {
  const rec = await playInteractive(
    DECKS.War(), DECKS.Loyalist(), "War", "Loyalist", 42,
    makeAnswerer(), noop, { A, B },
  );
  if (!rec.result) throw new Error(`${label}: no result`);
  console.log(`${label.padEnd(16)} → ${rec.result.winner} wins (${rec.result.why}) on turn ${rec.result.turn}, ${rec.moves.length} human moves`);
}

await run("AI vs AI", "ai", "ai");
await run("Human vs AI", "human", "ai");
await run("AI vs Human", "ai", "human");
console.log("OK — all three completed.");
