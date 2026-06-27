// Sigil campaign API — runs as AWS Lambda "sigil-sync" (us-west-2) behind an
// API Gateway HTTP API ($default route, payload v2). Modeled on the BinderBooks
// sync Lambda, grown into real per-user accounts + a server-authoritative game
// economy.
//
// One DynamoDB table "sigil" (pk + sk), single-table design:
//   USER#<lower>   ACCOUNT   { username, passhash, isAdmin, createdAt }
//   USER#<lower>   PROFILE   { coins, collection{cardId:count}, decks[], updatedAt }
//   SESSION#<tok>  SESSION   { username, expiresAt, ttl }            (DynamoDB TTL on `ttl`)
//   MATCH#<id>     MATCH     { username, reward, status, ttl }       (single-use reward nonce)
//   CARDS          DB        { version, characters[], items[], events[], updatedAt }
//   PACKS          DB        { packs[], updatedAt }
//
// Passwords are hashed with scrypt (node:crypto) so the deploy stays a single
// dependency-free index.mjs zip — the AWS SDK v3 is preinstalled in the runtime.
//
// Anti-cheat is deliberately light (the game engine runs in the browser, so a
// determined client can fake a win): /match/start issues a single-use matchId
// and /reward consumes it, which stops replay and unsolicited coin grants. Pack
// RNG and coin/collection mutations are fully server-side. Good enough for a
// personal game; deepen by running the match server-side if ever needed.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME || "sigil";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 3600 * 1000;
const MATCH_TTL_MS = 4 * 3600 * 1000;
const MAX_BYTES = 350_000; // DynamoDB item cap is 400 KB; leave headroom
const STARTER_COINS = 300;
// New accounts get a complete, known-good starter deck (the Goblin archetype,
// deduped & capped at 3 copies) so they can build and play immediately, then
// branch out with pack coins. Derived from src/data/decks.ts deckGoblin().
const STARTER_COLLECTION = {
  "Goblin Soldier": 3, "Crator, Goblin Soldier": 3, "Goblin Lieutenant": 3, "Goblin Captain": 2,
  "Lor'oak Goblin Grunt": 3, "Krakos, Goblin Archer": 3, "Lor'oak Goblin Commander": 2, Bogfang: 2,
  Murlifect: 2, Pyrnit: 1, Sootcrawler: 1, "Goblin Standard-Bearer": 2, "Goblin War": 2,
  "Horde Frenzy": 1, "Warren Muster": 3, "Goblin Shiv": 1, "Goblin Cleaver": 1, "Warboss' Maul": 1,
  Dispel: 2, Buckler: 1,
};
const scryptAsync = promisify(scrypt);

const res = (code, body) => ({
  statusCode: code,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const now = () => Date.now();
const epochSecs = (ms) => Math.floor(ms / 1000);

// ---- keys ----
const userPk = (u) => `USER#${String(u).toLowerCase()}`;
const sessionPk = (t) => `SESSION#${t}`;
const matchPk = (id) => `MATCH#${id}`;

// ---- password hashing (scrypt) ----
async function hashPassword(pw) {
  const salt = randomBytes(16);
  const dk = await scryptAsync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${dk.toString("hex")}`;
}
async function verifyPassword(pw, stored) {
  const [scheme, saltHex, hashHex] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const dk = await scryptAsync(pw, salt, expected.length);
  return dk.length === expected.length && timingSafeEqual(dk, expected);
}

// ---- session resolution ----
async function resolveUser(event) {
  const token = String(event.headers?.["x-session-token"] || "");
  if (!token) return null;
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: sessionPk(token), sk: "SESSION" } }));
  if (!r.Item || r.Item.expiresAt < now()) return null;
  const acct = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: userPk(r.Item.username), sk: "ACCOUNT" } }));
  if (!acct.Item) return null;
  return { username: acct.Item.username, isAdmin: !!acct.Item.isAdmin };
}

async function createSession(username) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = now() + SESSION_TTL_MS;
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: sessionPk(token), sk: "SESSION", username, expiresAt, ttl: epochSecs(expiresAt) },
    }),
  );
  return token;
}

// ---- profile helpers ----
async function getProfile(username) {
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: userPk(username), sk: "PROFILE" } }));
  return r.Item || null;
}
function publicProfile(p) {
  return { coins: p?.coins ?? 0, collection: p?.collection ?? {}, decks: p?.decks ?? [], updatedAt: p?.updatedAt ?? 0 };
}

// ---- card DB ----
async function getCardDb() {
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: "CARDS", sk: "DB" } }));
  return r.Item?.db || { version: 0, characters: [], items: [], events: [] };
}
async function getPacks() {
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: "PACKS", sk: "DB" } }));
  return r.Item?.db || { packs: [], updatedAt: 0 };
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
}

// ---- weighted pack RNG (server-side) ----
function rollPack(pack) {
  const slots = Math.max(1, pack.cardsPerPack || 5);
  const pool = pack.cardPool || []; // [{ cardId, weight }]
  const total = pool.reduce((s, c) => s + (c.weight > 0 ? c.weight : 1), 0);
  const out = [];
  for (let i = 0; i < slots; i++) {
    let r = Math.random() * total;
    let pick = pool[0];
    for (const c of pool) {
      r -= c.weight > 0 ? c.weight : 1;
      if (r <= 0) {
        pick = c;
        break;
      }
    }
    if (pick) out.push(pick.cardId);
  }
  return out;
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath || "";
  const ends = (s) => path.endsWith(s);
  if (method === "OPTIONS") return { statusCode: 204 }; // CORS preflight (API GW injects headers)

  // ---------- public auth routes ----------
  if (method === "POST" && ends("/register")) {
    const b = parseBody(event);
    if (!b) return res(400, { error: "bad json" });
    const username = String(b.username || "").trim();
    const password = String(b.password || "");
    if (username.length < 3 || username.length > 24 || !/^[A-Za-z0-9_]+$/.test(username))
      return res(400, { error: "username must be 3-24 chars (letters, digits, _)" });
    if (password.length < 6) return res(400, { error: "password must be at least 6 characters" });
    const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: userPk(username), sk: "ACCOUNT" } }));
    if (existing.Item) return res(409, { error: "username taken" });
    const passhash = await hashPassword(password);
    // first account ever (admin bootstrap) — if ADMIN_USER env matches, flag admin
    const isAdmin = process.env.ADMIN_USER ? username.toLowerCase() === process.env.ADMIN_USER.toLowerCase() : false;
    try {
      await ddb.send(
        new PutCommand({
          TableName: TABLE,
          Item: { pk: userPk(username), sk: "ACCOUNT", username, passhash, isAdmin, createdAt: now() },
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
    } catch (e) {
      if (e.name === "ConditionalCheckFailedException") return res(409, { error: "username taken" });
      throw e;
    }
    const profile = { pk: userPk(username), sk: "PROFILE", coins: STARTER_COINS, collection: { ...STARTER_COLLECTION }, decks: [], updatedAt: now() };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: profile }));
    const token = await createSession(username);
    return res(200, { token, username, isAdmin, profile: publicProfile(profile) });
  }

  if (method === "POST" && ends("/login")) {
    const b = parseBody(event);
    if (!b) return res(400, { error: "bad json" });
    const username = String(b.username || "").trim();
    const acct = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: userPk(username), sk: "ACCOUNT" } }));
    if (!acct.Item || !(await verifyPassword(String(b.password || ""), acct.Item.passhash)))
      return res(401, { error: "invalid username or password" });
    const token = await createSession(acct.Item.username);
    const profile = await getProfile(acct.Item.username);
    return res(200, { token, username: acct.Item.username, isAdmin: !!acct.Item.isAdmin, profile: publicProfile(profile) });
  }

  // ---------- public reads ----------
  if (method === "GET" && ends("/cards")) return res(200, await getCardDb());
  if (method === "GET" && ends("/packs")) return res(200, await getPacks());

  // ---------- everything below requires a session ----------
  const user = await resolveUser(event);
  if (!user) return res(401, { error: "unauthorized" });

  if (method === "POST" && ends("/logout")) {
    const token = String(event.headers?.["x-session-token"] || "");
    if (token) await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { pk: sessionPk(token), sk: "SESSION" } }));
    return res(200, { ok: true });
  }

  if (method === "GET" && ends("/me")) {
    const profile = await getProfile(user.username);
    return res(200, { username: user.username, isAdmin: user.isAdmin, profile: publicProfile(profile) });
  }

  if (method === "GET" && ends("/profile")) {
    return res(200, publicProfile(await getProfile(user.username)));
  }

  // PUT /profile — client-owned state only (decks). coins/collection are server-owned.
  if (method === "PUT" && ends("/profile")) {
    const b = parseBody(event);
    if (!b || !Array.isArray(b.decks)) return res(400, { error: "decks[] required" });
    if (JSON.stringify(b.decks).length > MAX_BYTES) return res(400, { error: "decks too large" });
    const r = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: userPk(user.username), sk: "PROFILE" },
        UpdateExpression: "SET decks = :d, updatedAt = :u",
        ExpressionAttributeValues: { ":d": b.decks, ":u": now() },
        ReturnValues: "ALL_NEW",
      }),
    );
    return res(200, publicProfile(r.Attributes));
  }

  // POST /match/start — issue a single-use reward nonce for a campaign match.
  if (method === "POST" && ends("/match/start")) {
    const b = parseBody(event) || {};
    const reward = Math.min(200, Math.max(0, Number(b.reward) || 100)); // server caps the payout
    const id = randomBytes(12).toString("base64url");
    const expiresAt = now() + MATCH_TTL_MS;
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: { pk: matchPk(id), sk: "MATCH", username: user.username, reward, status: "open", expiresAt, ttl: epochSecs(expiresAt) },
      }),
    );
    return res(200, { matchId: id, reward });
  }

  // POST /reward — consume a match nonce; grant coins on a win.
  if (method === "POST" && ends("/reward")) {
    const b = parseBody(event);
    if (!b || !b.matchId) return res(400, { error: "matchId required" });
    const m = await ddb.send(new GetCommand({ TableName: TABLE, Key: { pk: matchPk(b.matchId), sk: "MATCH" } }));
    if (!m.Item || m.Item.username !== user.username) return res(404, { error: "no such match" });
    if (m.Item.status !== "open" || m.Item.expiresAt < now()) return res(409, { error: "match already settled or expired" });
    // mark settled first (atomic single-use guard) before paying out
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: matchPk(b.matchId), sk: "MATCH" },
          UpdateExpression: "SET #s = :done",
          ConditionExpression: "#s = :open",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":done": "settled", ":open": "open" },
        }),
      );
    } catch (e) {
      if (e.name === "ConditionalCheckFailedException") return res(409, { error: "match already settled" });
      throw e;
    }
    if (!b.won) return res(200, { coins: (await getProfile(user.username))?.coins ?? 0, awarded: 0 });
    const r = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: userPk(user.username), sk: "PROFILE" },
        UpdateExpression: "SET coins = if_not_exists(coins, :z) + :r, updatedAt = :u",
        ExpressionAttributeValues: { ":r": m.Item.reward, ":z": 0, ":u": now() },
        ReturnValues: "ALL_NEW",
      }),
    );
    return res(200, { coins: r.Attributes.coins, awarded: m.Item.reward });
  }

  // POST /openpack — spend coins, roll the pack server-side, grant cards.
  if (method === "POST" && ends("/openpack")) {
    const b = parseBody(event);
    if (!b || !b.packId) return res(400, { error: "packId required" });
    const { packs } = await getPacks();
    const pack = (packs || []).find((p) => p.id === b.packId);
    if (!pack) return res(404, { error: "no such pack" });
    const profile = (await getProfile(user.username)) || { coins: 0, collection: {} };
    if ((profile.coins ?? 0) < pack.price) return res(402, { error: "not enough coins" });
    const opened = rollPack(pack);
    const collection = { ...(profile.collection || {}) };
    for (const id of opened) collection[id] = (collection[id] || 0) + 1;
    const r = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: userPk(user.username), sk: "PROFILE" },
        UpdateExpression: "SET coins = coins - :p, #col = :c, updatedAt = :u",
        ConditionExpression: "coins >= :p",
        ExpressionAttributeNames: { "#col": "collection" },
        ExpressionAttributeValues: { ":p": pack.price, ":c": collection, ":u": now() },
        ReturnValues: "ALL_NEW",
      }),
    );
    return res(200, { opened, coins: r.Attributes.coins, collection: r.Attributes.collection });
  }

  // ---------- admin: card & pack editors ----------
  if (method === "PUT" && ends("/cards")) {
    if (!user.isAdmin) return res(403, { error: "admin only" });
    const b = parseBody(event);
    if (!b || !b.db || !Array.isArray(b.db.characters)) return res(400, { error: "db payload required" });
    if (JSON.stringify(b.db).length > MAX_BYTES) return res(400, { error: "card db too large for one item" });
    const db = { ...b.db, updatedAt: now() };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: { pk: "CARDS", sk: "DB", db } }));
    return res(200, { ok: true, updatedAt: db.updatedAt });
  }

  if (method === "PUT" && ends("/packs")) {
    if (!user.isAdmin) return res(403, { error: "admin only" });
    const b = parseBody(event);
    if (!b || !Array.isArray(b.packs)) return res(400, { error: "packs[] required" });
    const db = { packs: b.packs, updatedAt: now() };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: { pk: "PACKS", sk: "DB", db } }));
    return res(200, { ok: true, updatedAt: db.updatedAt });
  }

  return res(405, { error: "method not allowed" });
};
