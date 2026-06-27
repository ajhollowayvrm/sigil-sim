// Non-destructive admin UI smoke test. Registers the account named by ADMINU
// (which must equal the Lambda's current ADMIN_USER), confirms the Admin tab and
// its editors load, then deletes the account. Does NOT save any edits.
//
// Usage: ADMINU=<name> node scripts/e2e-admin.mjs [http://localhost:5173]

import { chromium } from "playwright-core";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const URL = process.argv[2] || "http://localhost:5173";
const user = process.env.ADMINU || "admin";
const pass = "hunter2x";
let failed = false;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) failed = true;
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => {
  console.log("  ! pageerror:", e.message);
  failed = true;
});
try {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Register" }).click();
  await page.locator("input[type=text]").first().fill(user);
  await page.locator("input[type=password]").first().fill(pass);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForSelector(".coinpill", { timeout: 15000 });
  ok((await page.locator(".tab", { hasText: "Admin" }).count()) > 0, "Admin tab visible for admin account");

  await page.locator(".tab", { hasText: "Admin" }).click();
  // Card Editor (default sub-tab)
  await page.waitForSelector(".cardlist-row", { timeout: 15000 });
  ok((await page.locator(".cardlist-row").count()) > 10, "Card Editor lists cards from backend");
  await page.locator(".cardlist-row").first().click();
  ok((await page.locator(".jsoneditor").inputValue()).includes("Name"), "card JSON loads in editor");

  // Pack Editor
  await page.getByRole("button", { name: "Pack Editor" }).click();
  await page.waitForSelector(".editpool", { timeout: 15000 });
  ok((await page.locator(".bar select option").count()) >= 1, "Pack Editor loads packs");
  ok((await page.locator(".poolrow").count()) > 0, "pack pool rows render");

  // Lab
  await page.getByRole("button", { name: "Lab" }).click();
  ok((await page.getByRole("button", { name: /Watch a game/ }).count()) > 0, "Lab exposes the sim tools");
} catch (e) {
  console.log("  ✗ exception:", e.message);
  failed = true;
} finally {
  await browser.close();
  try {
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-2" }));
    for (const sk of ["ACCOUNT", "PROFILE"]) await ddb.send(new DeleteCommand({ TableName: "sigil", Key: { pk: `USER#${user}`, sk } }));
    console.log(`  · cleaned up ${user}`);
  } catch (e) {
    console.log("  · cleanup failed:", e.message);
  }
}
console.log(failed ? "\nADMIN E2E FAILED" : "\nADMIN E2E PASSED");
process.exit(failed ? 1 : 0);
