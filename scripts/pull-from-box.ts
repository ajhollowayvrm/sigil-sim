// pull-from-box — STUB (§2). The canonical Sigil design lives in the Box folder
// "Games / Sigil" (folder ID 392591204836). For now, AJ exports the files into
// docs/ manually (or they are pulled via a Box MCP connector during a session).
//
// This script documents the expected files and their Box IDs so the export can
// be automated later against the Box API.

const FILES: { saveAs: string; boxName: string; fileId: string }[] = [
  { saveAs: "docs/Ruleset.md", boxName: "Ruleset v0 7.md", fileId: "2300674583315" },
  { saveAs: "docs/CombatAndEffects.md", boxName: "Combat and Effects v0 3.md", fileId: "2300672163644" },
  { saveAs: "docs/Kaethlaan.md", boxName: "Kaethlaan v0 4.md", fileId: "2300735238125" },
  { saveAs: "docs/NextSteps.md", boxName: "Next Steps v0 7.md", fileId: "2300908067066" },
  { saveAs: "docs/Sigil Characters.csv", boxName: "Sigil Characters.csv", fileId: "2300735449597" },
  { saveAs: "docs/Sigil Events.csv", boxName: "Sigil Events.csv", fileId: "2300756658918" },
  { saveAs: "docs/Sigil Items.csv", boxName: "Sigil Items.csv", fileId: "2300755345637" },
  { saveAs: "reference/sigil_sim.py", boxName: "sigil_sim.py", fileId: "2302028898132" },
];

console.log("Sigil canon lives in Box: Games / Sigil (folder 392591204836).");
console.log("Automated pull is not wired up yet — export these files manually into the repo:\n");
for (const f of FILES) console.log(`  ${f.saveAs.padEnd(28)} <-  ${f.boxName}  (id ${f.fileId})`);
console.log(
  "\nThen apply the CLAUDE.md §5 amendments not yet in Box (six T2 Wilds + Metamorphosis),\n" +
    "and verify versions against docs/NextSteps.md (Ruleset v0.7 + Combat & Effects v0.3).",
);
