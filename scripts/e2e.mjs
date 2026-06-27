// Browser e2e smoke test driving the installed Edge via playwright-core.
// Verifies the campaign flow against the dev server + live backend:
//   register -> starter coins/cards -> build & save a deck -> open a pack.
// Cleans up the throwaway account afterward.
//
// Usage: node scripts/e2e.mjs [http://localhost:5173]

import { chromium } from "playwright-core";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const URL = process.argv[2] || "http://localhost:5173";
const user = "e2e" + Date.now().toString(36);
const pass = "hunter2x";
const log = (...a) => console.log(...a);
let failed = false;
const ok = (cond, msg) => {
  log((cond ? "  ✓ " : "  ✗ ") + msg);
  if (!cond) failed = true;
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => {
  log("  ! pageerror:", e.message);
  failed = true;
});
try {
  await page.goto(URL, { waitUntil: "networkidle" });
  ok((await page.locator("h1").textContent()) === "Sigil", "app boots (h1 = Sigil)");

  // register
  await page.getByRole("button", { name: "Register" }).click();
  await page.locator('input[type=text]').first().fill(user);
  await page.locator('input[type=password]').first().fill(pass);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForSelector(".coinpill", { timeout: 15000 });
  const coins = (await page.locator(".coinpill").textContent()) || "";
  ok(coins.includes("300"), `starter coins shown (${coins.trim()})`);

  // collection has the starter deck
  await page.locator(".tab", { hasText: "Collection" }).click();
  await page.waitForSelector(".colcard", { timeout: 10000 });
  const cardCount = await page.locator(".colcard").count();
  ok(cardCount > 10, `starter collection populated (${cardCount} card types)`);

  // build a deck: add ~22 cards by clicking the first tiles repeatedly
  await page.getByRole("button", { name: "Deck Builder" }).click();
  await page.getByRole("button", { name: "+ New deck" }).click();
  // click each pool card up to 3 times until deck hits 22
  for (let pass = 0; pass < 3; pass++) {
    const tiles = page.locator(".db-pool .colcard");
    const n = await tiles.count();
    for (let i = 0; i < n; i++) {
      const txt = (await page.locator(".db-count").textContent()) || "";
      const have = parseInt(txt, 10) || 0;
      if (have >= 22) break;
      await tiles.nth(i).click();
    }
    const txt = (await page.locator(".db-count").textContent()) || "";
    if ((parseInt(txt, 10) || 0) >= 22) break;
  }
  const deckTxt = (await page.locator(".db-count").textContent()) || "";
  ok((parseInt(deckTxt, 10) || 0) >= 20, `deck reaches legal size (${deckTxt.trim()})`);
  ok((await page.locator(".db-ok").count()) > 0, "deck reports legal");
  await page.getByRole("button", { name: "Save deck" }).click();
  await page.waitForTimeout(1500);
  ok((await page.getByRole("button", { name: "Save deck" }).isDisabled()), "save succeeded (button disabled, not dirty)");

  // open a pack in the store
  await page.getByRole("button", { name: "Store" }).click();
  await page.waitForSelector(".packcard", { timeout: 10000 });
  const goblinBtn = page.locator(".packcard", { hasText: "Goblin" }).getByRole("button");
  await goblinBtn.click();
  await page.waitForSelector(".reveal .colcard", { timeout: 15000 });
  const opened = await page.locator(".reveal .colcard").count();
  ok(opened === 5, `pack opened 5 cards (${opened})`);
  await page.getByRole("button", { name: "Add to collection" }).click();
  const coins2 = (await page.locator(".coinpill").textContent()) || "";
  ok(/\b210\b/.test(coins2), `coins deducted after pack (${coins2.trim()}, expect 210)`);

  // Play tab: matchmake against a hidden opponent and confirm the board renders
  await page.locator(".tab", { hasText: "Play" }).click();
  await page.waitForSelector(".prematch", { timeout: 10000 });
  ok((await page.locator(".prematch select option").count()) >= 1, "a legal deck is selectable for play");
  await page.getByRole("button", { name: "Find match" }).click();
  await page.waitForSelector(".table", { timeout: 20000 });
  ok((await page.locator(".table").count()) === 1, "board renders for the match");
  ok((await page.getByText("Unknown opponent").count()) > 0, "opponent identity hidden");
} catch (e) {
  log("  ✗ exception:", e.message);
  failed = true;
} finally {
  await browser.close();
  // cleanup throwaway account
  try {
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-2" }));
    for (const sk of ["ACCOUNT", "PROFILE"]) await ddb.send(new DeleteCommand({ TableName: "sigil", Key: { pk: `USER#${user}`, sk } }));
    log(`  · cleaned up ${user}`);
  } catch (e) {
    log("  · cleanup failed:", e.message);
  }
}
log(failed ? "\nE2E FAILED" : "\nE2E PASSED");
process.exit(failed ? 1 : 0);
