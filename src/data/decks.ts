// The four sample decks (§8), ported from the prototype but using the canonical
// CSV card names (the prototype used shortened names — the #1 source of drift).
// Each deck is padded/truncated to 30 cards.

function D(...parts: string[][]): string[] {
  let d: string[] = [];
  for (const p of parts) d = d.concat(p);
  if (d.length >= 30) return d.slice(0, 30);
  while (d.length < 30) d.push("Stoneback");
  return d;
}

export function deckLoyalist(): string[] {
  return D(
    [
      "King Honathan of Kaethlaan",
      "Arlia, Destined Trainee",
      "Mage Arlia",
      "Squire Arlia",
      "Arlia, Youngest Archmage",
      "Captain Arlia of the Royal Army",
      "The Wandering Acolyte Arlia",
      "The Ascended",
      "Touched Child Hresheeba",
      "Old Maid Hresheeba",
      "Channel Being",
      "Channel Being",
      "Disillusioned",
    ],
    ["Instructional Tome", "Instructional Sword", "Twin Daggers", "Twin Daggers", "Tower Shield", "Vital Charm", "Field Rations"],
    ["Lumenkit", "Glimmermoth", "Stoneback", "Stoneback", "Murlifect", "Bogfang", "Cinderpel", "Galewing"],
  );
}

export function deckGoblin(): string[] {
  return D(
    [
      "Goblin Soldier",
      "Goblin Soldier",
      "Goblin Soldier",
      "Goblin Lieutenant",
      "Goblin Lieutenant",
      "Goblin Captain",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Commander",
      "Goblin War",
      "Horde Frenzy",
    ],
    ["Twin Daggers", "Tower Shield", "Buckler", "Buckler"],
    ["Bogfang", "Bogfang", "Stoneback", "Stoneback", "Murlifect", "Murlifect", "Galewing", "Cinderpel"],
  );
}

export function deckWar(): string[] {
  return D(
    [
      "Kael, Destined Trainee",
      "Swiftblade Kael",
      "Kael the Captured",
      "Kael the Runaway",
      "Kael the Killer",
      "The Silent",
      "Illyego, the Orphan",
      "Illyego, the Soldier",
      "Illyego, the Conqueror",
      "A Man Bred for War",
      "Sootcrawler",
      "Pyrnit",
      "Bogfang",
      "War",
      "Holy War",
      "Taken Prisoner",
      "Taken Prisoner",
      "The Broken March",
      "Rally to War",
    ],
    [
      "Back-Alley Blade",
      "Whetstone",
      "Buckler",
      "Twin Daggers",
      "Tidecaller's Pearl",
      "Berserker's Brand",
      "Warmonger's Resolve",
      "Unbroken Will",
      "Vital Charm",
      "Field Rations",
      "Whetstone",
    ],
  );
}

export function deckWild(): string[] {
  return D(
    [
      "Bogfang",
      "Bogfang",
      "Bogfang",
      "Stoneback",
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
      "Embermaw",
      "Craghide",
      "Skirrl",
      "Tidewretch",
      "Hollowed Stag",
      "Gravecreep",
      "Metamorphosis",
      "Metamorphosis",
      "Metamorphosis",
      "Metamorphosis",
    ],
    ["Twin Daggers", "Whetstone", "Buckler"],
  );
}

export const DECKS: Record<string, () => string[]> = {
  War: deckWar,
  Loyalist: deckLoyalist,
  Goblin: deckGoblin,
  Wild: deckWild,
};

export const DECK_NAMES = Object.keys(DECKS);
