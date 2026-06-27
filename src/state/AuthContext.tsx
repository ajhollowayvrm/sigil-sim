// AuthContext — current account, session, and profile (coins/collection/decks).
//
// On mount, if a session token is cached we resolve it via GET /me. Login and
// register store the token and hydrate the profile. Other tabs mutate the
// server (reward / openpack / deck save) and call the provided setters to keep
// this context in sync without a round-trip.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "../net/api";
import type { Deck, Profile } from "../net/api";

interface AuthState {
  ready: boolean; // initial session resolution finished
  username: string | null;
  isAdmin: boolean;
  profile: Profile | null;
  signedIn: boolean;
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  setProfile: (p: Profile) => void;
  patchProfile: (patch: Partial<Profile>) => void;
  saveDecks: (decks: Deck[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!api.apiConfigured() || !api.getToken()) {
        setReady(true);
        return;
      }
      try {
        const m = await api.me();
        if (!alive) return;
        setUsername(m.username);
        setIsAdmin(m.isAdmin);
        setProfileState(m.profile);
      } catch {
        api.setToken(null); // stale/invalid token
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function adopt(r: api.AuthResult) {
    api.setToken(r.token);
    setUsername(r.username);
    setIsAdmin(r.isAdmin);
    setProfileState(r.profile);
  }

  const value = useMemo<AuthState>(
    () => ({
      ready,
      username,
      isAdmin,
      profile,
      signedIn: !!username,
      login: async (u, p) => adopt(await api.login(u, p)),
      register: async (u, p) => adopt(await api.register(u, p)),
      logout: async () => {
        try {
          await api.logout();
        } catch {
          /* best effort */
        }
        api.setToken(null);
        setUsername(null);
        setIsAdmin(false);
        setProfileState(null);
      },
      setProfile: (p) => setProfileState(p),
      patchProfile: (patch) => setProfileState((cur) => (cur ? { ...cur, ...patch } : cur)),
      saveDecks: async (decks) => {
        const updated = await api.saveDecks(decks);
        setProfileState(updated);
      },
      refresh: async () => {
        const m = await api.me();
        setUsername(m.username);
        setIsAdmin(m.isAdmin);
        setProfileState(m.profile);
      },
    }),
    [ready, username, isAdmin, profile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
