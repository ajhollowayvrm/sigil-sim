// Typed client for the Sigil campaign backend (AWS Lambda sigil-sync).
//
// The session token lives in localStorage under "sigil:session" and is sent as
// the x-session-token header on authed calls. Coins/collection are server-owned
// (only /reward and /openpack mutate them); the client may only persist decks.

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "";
const TOKEN_KEY = "sigil:session";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  if (!BASE) throw new ApiError(0, "API base URL not configured (VITE_API_BASE)");
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth) {
    const t = getToken();
    if (!t) throw new ApiError(401, "not signed in");
    headers["x-session-token"] = t;
  }
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "network error — is the backend reachable?");
  }
  const text = await r.text();
  const data = text ? safeJson(text) : null;
  if (!r.ok) throw new ApiError(r.status, (data && (data.error || data.message)) || `HTTP ${r.status}`);
  return data as T;
}
function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ---- shapes ----
export interface Deck {
  id: string;
  name: string;
  cards: string[]; // card names (engine card ids)
}
export interface Profile {
  coins: number;
  collection: Record<string, number>; // cardId -> count owned
  decks: Deck[];
  updatedAt: number;
}
export interface AuthResult {
  token: string;
  username: string;
  isAdmin: boolean;
  profile: Profile;
}
export interface Me {
  username: string;
  isAdmin: boolean;
  profile: Profile;
}
export interface Pack {
  id: string;
  name: string;
  theme: string;
  price: number;
  cardsPerPack: number;
  cardPool: { cardId: string; weight: number }[];
}
export interface CardDb {
  version: number;
  characters: any[];
  items: any[];
  events: any[];
  updatedAt?: number;
}

// ---- auth ----
export const register = (username: string, password: string) =>
  request<AuthResult>("POST", "/register", { username, password });
export const login = (username: string, password: string) =>
  request<AuthResult>("POST", "/login", { username, password });
export const logout = () => request<{ ok: true }>("POST", "/logout", {}, true);
export const me = () => request<Me>("GET", "/me", undefined, true);

// ---- profile / decks ----
export const getProfile = () => request<Profile>("GET", "/profile", undefined, true);
export const saveDecks = (decks: Deck[]) => request<Profile>("PUT", "/profile", { decks }, true);

// ---- economy ----
export const startMatch = (reward?: number) =>
  request<{ matchId: string; reward: number }>("POST", "/match/start", { reward }, true);
export const claimReward = (matchId: string, won: boolean) =>
  request<{ coins: number; awarded: number }>("POST", "/reward", { matchId, won }, true);
export const openPack = (packId: string) =>
  request<{ opened: string[]; coins: number; collection: Record<string, number> }>("POST", "/openpack", { packId }, true);
export const getPacks = () => request<{ packs: Pack[]; updatedAt: number }>("GET", "/packs");

// ---- admin ----
export const getCards = () => request<CardDb>("GET", "/cards");
export const putCards = (db: CardDb) => request<{ ok: true; updatedAt: number }>("PUT", "/cards", { db }, true);
export const putPacks = (packs: Pack[]) => request<{ ok: true; updatedAt: number }>("PUT", "/packs", { packs }, true);

export const apiConfigured = () => !!BASE;
