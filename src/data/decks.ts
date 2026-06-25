// The four sample decks (§8). Decks are 40 cards (raised from 30 for consistency —
// more copies of key forms + tutors so transformation lines actually assemble).

const DECK_SIZE = 40;

function D(...parts: string[][]): string[] {
  let d: string[] = [];
  for (const p of parts) d = d.concat(p);
  if (d.length >= DECK_SIZE) return d.slice(0, DECK_SIZE);
  while (d.length < DECK_SIZE) d.push("Stoneback");
  return d;
}

export function deckLoyalist(): string[] {
  return D(
    [
      "King Honathan of Kaethlaan",
      "Arlia, Destined Trainee",
      "Arlia, Destined Trainee",
      "Mage Arlia",
      "Squire Arlia",
      "Captain Arlia of the Royal Army",
      // Kael's LOYAL road — lives here, not in War, because The King's Blade's whole
      // payoff keys off King Honathan (mix-n-match: Kael spans War's outlaw road and
      // Loyalist's loyal road). Honathan's aura + the riders make Shadow/King's Blade sing.
      "Kael, Destined Trainee",
      "Kael, Destined Trainee",
      "Swiftblade Kael",
      "Swiftblade Kael",
      "Kael the Shadow",
      "The King's Blade",
      "Kaethlaan Recruit",
      "Kaethlaan Recruit",
      "Kaethlaan Knight",
      "Kaethlaan Knight",
      "Kaethlaan Knight",
      "Sword of the Realm",
      "Sword of the Realm",
      "Strango, Knight Trainer",
      "Strango, Knight Trainer",
      "Kaethlaan Archer",
      "Kaethlaan Sniper",
      "Thomas, Scared Recruit",
      "Thomas, Scared Recruit",
      "Soldier Thomas",
      "Thomas the Brave",
    ],
    ["Instructional Sword", "Instructional Tome", "Kaethlaan Banner", "Twin Daggers", "Vital Charm"],
    ["Close the Gates", "Reinforce the Front Lines", "Field Promotion", "Field Promotion", "Conscription Order", "Truce", "Truce", "Sanctuary"],
  );
}

export function deckGoblin(): string[] {
  // Rebuilt for the 3-copy cap (Ruleset v0.7 Setup). The old list ran Goblin Soldier ×5
  // and Lor'oak Goblin Grunt ×5 — both now illegal. Diversified with two new named T1
  // goblins: Crator (a tougher soldier body) and Krakos (Wind archer, hits passive).
  // No card exceeds 3 copies.
  return D(
    [
      "Goblin Soldier",
      "Goblin Soldier",
      "Goblin Soldier",
      "Crator, Goblin Soldier",
      "Crator, Goblin Soldier",
      "Crator, Goblin Soldier",
      "Goblin Lieutenant",
      "Goblin Lieutenant",
      "Goblin Lieutenant",
      "Goblin Captain",
      "Goblin Captain",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Grunt",
      "Krakos, Goblin Archer",
      "Krakos, Goblin Archer",
      "Krakos, Goblin Archer",
      "Lor'oak Goblin Commander",
      "Lor'oak Goblin Commander",
      "Bogfang",
      "Bogfang",
      "Murlifect",
      "Murlifect",
      "Stoneback",
      "Pyrnit",
      "Sootcrawler",
    ],
    ["Goblin War", "Goblin War", "Horde Frenzy", "Warren Muster", "Warren Muster", "Warren Muster"],
    ["Goblin Shiv", "Goblin Shiv", "Goblin Cleaver", "Warboss' Maul", "Tower Shield", "Buckler", "Buckler", "Twin Daggers"],
  );
}

export function deckWar(): string[] {
  // 40 cards. Round 1 rebuild: commit to the self-sufficient Outlaw Kael road
  // (Captured → Runaway → Killer → The Silent, which needs no Honathan) + the
  // Illyego war engine + a War-Torn payoff (A Man Bred for War, now castable).
  // Dropped the loyal road's King's Blade (its payoff is dead without Honathan).
  return D(
    [
      "Kael, Destined Trainee",
      "Kael, Destined Trainee",
      "Kael, Destined Trainee",
      "Swiftblade Kael",
      "Swiftblade Kael",
      "Swiftblade Kael",
      "Kael the Captured",
      "Kael the Captured",
      "Kael the Runaway",
      "Kael the Runaway",
      "Kael the Killer",
      "Kael the Killer",
      "The Silent",
      "Illyego, the Orphan",
      "Illyego, the Orphan",
      "Illyego, the Orphan",
      "Illyego, the Soldier",
      "Illyego, the Soldier",
      "Illyego, the Soldier",
      "Illyego, the Conqueror",
      "Illyego, the Conqueror",
      "A Man Bred for War",
      "A Man Bred for War",
    ],
    [
      "War",
      "War",
      "Holy War",
      "Taken Prisoner",
      "Taken Prisoner",
      "The Broken March",
      "Rally to War",
      "Field Promotion",
      "Field Promotion",
      "War Effort",
      "War Effort",
      "Sanctuary",
    ],
    [
      "Whetstone",
      "Berserker's Brand",
      "Twin Daggers",
      "Back-Alley Blade",
      "Vital Charm",
    ],
  );
}

export function deckWild(): string[] {
  return D(
    [
      "Bogfang",
      "Bogfang",
      "Stoneback",
      "Murlifect",
      "Murlifect",
      "Cinderpel",
      "Cinderpel",
      "Galewing",
      "Galewing",
      "Lumenkit",
      "Lumenkit",
      "Glimmermoth",
      "Sootcrawler",
      "Sootcrawler",
      "Pyrnit",
      "Pyrnit",
      "Frostnip",
      "Tidewhisk",
      "Barangrang",
      "Thestral",
      "Embermaw",
      "Embermaw",
      "Craghide",
      "Skirrl",
      "Skirrl",
      "Tidewretch",
      "Hollowed Stag",
      "Gravecreep",
      "Gravecreep",
      "Metamorphosis",
      "Metamorphosis",
      "Metamorphosis",
      "Metamorphosis",
      "Metamorphosis",
      "Metamorphosis",
    ],
    ["Twin Daggers", "Whetstone", "Whetstone", "Call of the Wild", "Call of the Wild"],
  );
}

export function deckDivineChannel(): string[] {
  // The Divine Channel archetype: climb Arlia to THE ASCENDED (the capstone whose
  // stats = T3 items consumed ×20, and whose The Channel chain is an AoE board-wipe),
  // backed by Channel-body chain enablers (keepers shrink the chain). Slow combo:
  // Arlia → Mage → Wandering Acolyte (needs Disillusioned) → Ascended (needs T3 items).
  return D(
    [
      "Channel Being",
      "Channel Being",
      "Channel Being",
      "Channel Being",
      "Channel Adept",
      "Channel Adept",
      "Channel Adept",
      "Hierophant of the Channel",
      "Hierophant of the Channel",
      "Touched Child Hresheeba",
      "Touched Child Hresheeba",
      "Touched Child Hresheeba",
      "Old Maid Hresheeba",
      "Old Maid Hresheeba",
      "Old Maid Hresheeba",
      "Old Maid Hresheeba",
      "Arlia, Destined Trainee",
      "Arlia, Destined Trainee",
      "Mage Arlia",
      "Mage Arlia",
      "The Wandering Acolyte Arlia",
      "The Wandering Acolyte Arlia",
      "The Ascended",
    ],
    ["Call of the Channel", "Call of the Channel", "Call of the Channel", "Field Promotion", "Field Promotion", "Disillusioned", "Reinforce the Front Lines", "Truce", "Truce", "Sanctuary", "Sanctuary", "Bulwark"],
    ["Twin Daggers", "Instructional Tome", "Instructional Tome", "Vital Charm", "Relic of the Forsaken"],
  );
}

export const DECKS: Record<string, () => string[]> = {
  War: deckWar,
  Loyalist: deckLoyalist,
  Goblin: deckGoblin,
  Wild: deckWild,
  DivineChannel: deckDivineChannel,
};

export const DECK_NAMES = Object.keys(DECKS);
