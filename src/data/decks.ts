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
  // "Defense of the Kingdom; sustain and continue." Reworked toward an EXCELLENT thematic
  // fit (was ◐ "slightly diluted"): the deck now wins the way its identity says it should —
  // THE WALL HOLDS, THEN THE ROYAL ARMY STRIKES AS ONE — instead of by sniping the Leader.
  //
  // Out: the Kael ASSASSIN road (Kael the Shadow -> The King's Blade) — a lone tempo
  //   Leader-sniper that pulled Loyalist toward racing, the opposite of outlasting; also
  //   Mage Arlia (the caster/Divine-Channel branch) and the Thomas filler line.
  // In (bodyguard): Kael's LOYAL-DEFENSIVE road — Second in Command Kael ("At Her Side":
  //   redirect attacks at Arlia onto him, +10/+10 while you control Arlia). Kael stays the
  //   mix-n-match character (War's outlaw road, Loyalist's bodyguard road) but here he SHIELDS.
  // Win condition (army chains): the coordinated Royal Army chains — Strango's Drill Formation
  //   (Chain 2 Royal Army), Honathan's Rally the Realm (sum +20), Captain Arlia's Triangle
  //   Attack (the elite Kaethlaan-Knights trio, sum +30). The king commands; the army acts as one.
  // Sustain shell (all engine-modeled): redirect walls (Squire Arlia ×2, 2nd-in-Command Kael),
  //   heals (Reinforce ×2), Max-HP bookkeeping (Medical Advancement — Plague's math-opposite),
  //   DEF saves (Bulwark ×2), single-target + board fog (Sanctuary ×2, Truce ×2), Kaethlaan
  //   war-immunity (Close the Gates). (War College is a no-op and Shield Wall isn't modeled —
  //   left out rather than faked.)
  return D(
    [
      "King Honathan of Kaethlaan",
      // Arlia line — the defensive Knight road (redirect + Triangle Attack chain), no Mage branch.
      "Arlia, Destined Trainee",
      "Arlia, Destined Trainee",
      "Arlia, Destined Trainee",
      "Squire Arlia",
      "Squire Arlia",
      "Captain Arlia of the Royal Army",
      "Captain Arlia of the Royal Army",
      // Kael's BODYGUARD road (replaces the assassin road): Swiftblade -> Second in Command Kael.
      "Kael, Destined Trainee",
      "Kael, Destined Trainee",
      "Swiftblade Kael",
      "Swiftblade Kael",
      "Second in Command Kael",
      // Royal Army soldier wall + the chain bodies.
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
    ],
    ["Kaethlaan Banner", "Dispel", "Dispel"],
    [
      "Close the Gates",
      "Medical Advancement",
      "Reinforce the Front Lines",
      "Reinforce the Front Lines",
      "Bulwark",
      "Bulwark",
      "Sanctuary",
      "Sanctuary",
      "Truce",
      "Truce",
      "Conscription Order",
      "Conscription Order",
      "Field Promotion",
    ],
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
    ["Goblin Shiv", "Goblin Shiv", "Goblin Cleaver", "Warboss' Maul", "Dispel", "Buckler", "Buckler", "Dispel"],
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
      "Dispel",
      "Back-Alley Blade",
      "Dispel",
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
    ["Dispel", "Dispel", "Whetstone", "Call of the Wild", "Call of the Wild"],
  );
}

export function deckDivineChannel(): string[] {
  // The Divine Channel archetype: "amazing potential and wild effects, hard to get it all
  // out." TWO paths that ENABLE EACH OTHER (not compete) — the consistent CHURCH and the
  // sky-high ASCENDED:
  //   - The CHURCH is the win-con / plan B: Channel bodies + Hierophants form the Divine
  //     Channel chain; keepers (Old Maid Hresheeba, Hierophant Vossuth) shrink it so it fires;
  //     Maredd armors them; St. Faechious gives ALL Divine Channel +20 ATK & chain-from-any-zone.
  //   - THE ASCENDED is the ceiling: Arlia → Mage → Acolyte → Ascended, whose stats ARE the
  //     items it consumes ×20 (ANY tier — engine fix) and whose The Channel chain wipes the
  //     board (sum ATK ×2 to everyone). St. Faechious's +20 and the keepers also super-charge
  //     IT — the Church's own engine is what makes the apotheosis land and fire.
  //   - The glue is a DUAL-PURPOSE ITEM PACKAGE: cheap fuel (Whetstone/Buckler/Grimoire/
  //     Oathblade/Focus) buffs ordinary clergy climbs OR piles up in hand to feed The Ascended
  //     (now any tier counts ×20); a few T3 (Relic/Warlord's Spoils) meet its entry gate. Items
  //     are never dead — they power the Church when the apotheosis doesn't come.
  // Piloted by a DEDICATED per-deck policy (sim/ai.ts divineChannelPolicy): the generic greedy
  // AI is too myopic to assemble a 4-deep combo, so DC gets its own brain that deploys/shelters
  // the Arlia line, sequences Disillusioned + Opportunity, and ascends + fires The Channel on cue.
  return D(
    [
      // Church core — the consistent win-con AND the Ascended's enablers (keepers shrink The
      // Channel; St. Faechious +20 ATK to ALL Divine Channel super-charges the apotheosis too).
      "Channel Being",
      "Channel Being",
      "Channel Being",
      "Channel Adept",
      "Channel Adept",
      "Channel Adept",
      "Touched Child Hresheeba",
      "Touched Child Hresheeba",
      "Touched Child Hresheeba",
      "Old Maid Hresheeba",
      "Old Maid Hresheeba",
      "Old Maid Hresheeba",
      "Hierophant Vossuth",
      "Hierophant Maredd",
      "Hierophant Calyx",
      "St. Faechious",
      // The apotheosis line — the ceiling (leaner; the Church carries the other games).
      "Arlia, Destined Trainee",
      "Arlia, Destined Trainee",
      "Mage Arlia",
      "Mage Arlia",
      "The Wandering Acolyte Arlia",
      "The Wandering Acolyte Arlia",
      "The Ascended",
    ],
    [
      // Items double as clergy fuel/equip AND Ascended food (any tier ×20). A couple T3 meet
      // the entry gate; Instructional Tomes equip a clergy body or pile up for the apotheosis.
      "Relic of the Forsaken",
      "Relic of the Forsaken",
      "Instructional Tome",
      "Instructional Tome",
      "Dispel",
      "Dispel",
    ],
    [
      // The Open Channel ×2 — the slot-cost persistent tutor (Round 13): a repeatable next-form
      // fetch that finally lets the deep apotheosis line assemble. DC-locked, so it doesn't leak.
      "The Open Channel",
      "The Open Channel",
      // Seeping Doubt — repeatable coin-flip Disillusioned engine; covers the Acolyte gate the
      // one-shot Disillusioned cards can't reliably reach. Pairs with The Open Channel (forms).
      "Seeping Doubt",
      "Call of the Channel",
      "Call of the Channel",
      "Field Promotion",
      "Disillusioned",
      "Disillusioned",
      "Opportunity",
      "Truce",
      "Bulwark",
    ],
  );
}

export function deckPlague(): string[] {
  // The 6th archetype: "weaken the enemy and bask in immunity."
  // PRE-SIM APPROXIMATION — modeled: Plague's both-sides −10 Max HP field, the Lab's +30
  // Max HP sustain, the Seremin/Poultrain DEF, the Chris O'Donner ATK aura, the Seremin climb.
  // NOT modeled (so these numbers are a low-confidence FLOOR): Experiment 2615's conditional
  // +80 DEF / regen / Plagued-scaling, Dr. Venner's no-damage lock chain, the Plagued-spread,
  // the Plague-duration transform gates, and the Plagued Persons (sustained-by). The canon
  // deck (Box) also runs Grant Proposal / Quarantine / Containment Ward / Plagued Persons,
  // and intends Seremin as the elevated Leader (the sim AI crowns by raw stats instead).
  return D(
    [
      "Seremin the Sickly",
      "Seremin the Sickly",
      "Seremin the Sickly",
      "Seremin the Plaguebearer",
      "Seremin the Plaguebearer",
      "Seremin the Plaguebearer",
      "Patient Zero Seremin",
      "Patient Zero Seremin",
      "Experiment 2615",
      "Experiment 4432, Stage 1",
      "Experiment 4432, Stage 1",
      "Experiment 4432, Stage 1",
      "Experiment 4432, Stage 2",
      "Experiment 4432, Stage 2",
      "Experiment 4423A, Stage 1",
      "Experiment 4423A, Stage 1",
      "Experiment 4423A, Stage 1",
      "Experiment 4423A, Stage 2",
      "Experiment 4423A, Stage 2",
      "Dr. Abigail Venner",
      "Dr. Abigail Venner",
      "Dr. Mark Poultrain",
      "Dr. Mark Poultrain",
      "Chris O'Donner",
    ],
    [
      "Plague",
      "Plague",
      "Plague",
      "O'Donner Research Lab",
      "O'Donner Research Lab",
      "O'Donner Research Lab",
      "Patient Intake",
      "Patient Intake",
      "Patient Intake",
      "Field Promotion",
      "Field Promotion",
      "Sanctuary",
      "Sanctuary",
      "Sanctuary",
      "Bulwark",
      "Bulwark",
    ],
  );
}

export const DECKS: Record<string, () => string[]> = {
  War: deckWar,
  Loyalist: deckLoyalist,
  Goblin: deckGoblin,
  Wild: deckWild,
  DivineChannel: deckDivineChannel,
  Plague: deckPlague,
};

export const DECK_NAMES = Object.keys(DECKS);
