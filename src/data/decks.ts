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
      "Kaethlaan Recruit",
      "Kaethlaan Recruit",
      "Kaethlaan Recruit",
      "Kaethlaan Knight",
      "Kaethlaan Knight",
      "Sword of the Realm",
      "Strango, Knight Trainer",
      "Strango, Knight Trainer",
      "Brutal Fighter Strango",
      "Kaethlaan Archer",
      "Kaethlaan Archer",
      "Kaethlaan Sniper",
      "Thomas, Scared Recruit",
      "Thomas, Scared Recruit",
      "Soldier Thomas",
      "Thomas the Brave",
      "Channel Being",
      "Channel Being",
      "Channel Adept",
      "Hierophant of the Channel",
      "Touched Child Hresheeba",
      "Old Maid Hresheeba",
    ],
    ["Instructional Sword", "Instructional Tome", "Kaethlaan Banner", "Twin Daggers", "Vital Charm", "Field Rations", "Tower Shield"],
    ["Close the Gates", "Reinforce the Front Lines", "Reinforce the Front Lines", "Field Promotion", "Field Promotion"],
  );
}

export function deckGoblin(): string[] {
  return D(
    [
      "Goblin Soldier",
      "Goblin Soldier",
      "Goblin Soldier",
      "Goblin Soldier",
      "Goblin Soldier",
      "Goblin Lieutenant",
      "Goblin Lieutenant",
      "Goblin Lieutenant",
      "Goblin Lieutenant",
      "Goblin Captain",
      "Goblin Captain",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Grunt",
      "Lor'oak Goblin Commander",
      "Lor'oak Goblin Commander",
      "Bogfang",
      "Bogfang",
      "Murlifect",
      "Murlifect",
      "Stoneback",
      "Stoneback",
      "Galewing",
      "Cinderpel",
      "Sootcrawler",
      "Pyrnit",
    ],
    ["Goblin War", "Goblin War", "Horde Frenzy", "Horde Frenzy"],
    ["Goblin Shiv", "Goblin Shiv", "Goblin Cleaver", "Warboss' Maul", "Tower Shield", "Buckler", "Buckler", "Twin Daggers"],
  );
}

export function deckWar(): string[] {
  // 40 cards built for climb consistency: 3× each base + hub of the Kael (loyal road)
  // and Illyego lines, plus tutors (Field Promotion / War Effort) to find the next form.
  return D(
    [
      "Kael, Destined Trainee",
      "Kael, Destined Trainee",
      "Kael, Destined Trainee",
      "Swiftblade Kael",
      "Swiftblade Kael",
      "Swiftblade Kael",
      "Kael the Shadow",
      "Kael the Shadow",
      "The King's Blade",
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
      "Sootcrawler",
      "Sootcrawler",
      "Pyrnit",
      "Bogfang",
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
    ],
    [
      "Whetstone",
      "Whetstone",
      "Berserker's Brand",
      "Twin Daggers",
      "Vital Charm",
      "Back-Alley Blade",
      "Tidecaller's Pearl",
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
    ["Twin Daggers", "Whetstone", "Whetstone"],
  );
}

export const DECKS: Record<string, () => string[]> = {
  War: deckWar,
  Loyalist: deckLoyalist,
  Goblin: deckGoblin,
  Wild: deckWild,
};

export const DECK_NAMES = Object.keys(DECKS);
