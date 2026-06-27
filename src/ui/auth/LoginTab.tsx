// Log-In tab — register / login / logout. The only tab available signed-out.

import { useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { apiConfigured, ApiError } from "../../net/api";

export function LoginTab() {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!apiConfigured()) {
    return (
      <div className="banner">Backend not configured — set VITE_API_BASE and rebuild to enable accounts.</div>
    );
  }

  if (auth.signedIn) {
    return (
      <div className="authcard">
        <h2>Signed in</h2>
        <div className="authrow">
          <span className="authlabel">Account</span>
          <strong>{auth.username}</strong>
          {auth.isAdmin && <span className="adminbadge">ADMIN</span>}
        </div>
        <div className="authrow">
          <span className="authlabel">Coins</span>
          <strong>{auth.profile?.coins ?? 0}</strong>
        </div>
        <div className="authrow">
          <span className="authlabel">Collection</span>
          <strong>{Object.keys(auth.profile?.collection ?? {}).length} distinct cards</strong>
        </div>
        <div className="authrow">
          <span className="authlabel">Decks</span>
          <strong>{auth.profile?.decks?.length ?? 0}</strong>
        </div>
        <button className="ghost" onClick={() => auth.logout()}>
          Log out
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "register") await auth.register(username.trim(), password);
      else await auth.login(username.trim(), password);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authcard">
      <div className="authtabs">
        <button className={mode === "login" ? "" : "ghost"} onClick={() => setMode("login")} type="button">
          Log in
        </button>
        <button className={mode === "register" ? "" : "ghost"} onClick={() => setMode("register")} type="button">
          Register
        </button>
      </div>
      <form onSubmit={submit}>
        <label className="authfield">
          <span>Username</span>
          <input
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            placeholder="3–24 letters, digits, _"
          />
        </label>
        <label className="authfield">
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="at least 6 characters"
          />
        </label>
        {err && <div className="autherr">{err}</div>}
        <button type="submit" disabled={busy || !username || !password}>
          {busy ? "…" : mode === "register" ? "Create account" : "Log in"}
        </button>
        {mode === "register" && (
          <p className="authnote">New accounts start with 300 coins and an empty collection — open a pack to begin.</p>
        )}
      </form>
    </div>
  );
}
