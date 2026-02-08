// src/pages/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { devLogin, setUserId, clearUserId, clearAccessToken, getUserId } from "../lib/api";
import { useAuthContext } from "@asgardeo/auth-react";

export default function Login() {
  const nav = useNavigate();

  // Asgardeo
  const { signIn, state } = useAuthContext();

  // Dev login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // UI-only for now
  const [remember, setRemember] = useState(true);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const asgardeoReady = useMemo(() => {
    const cfgOk =
      Boolean(import.meta.env.VITE_ASGARDEO_CLIENT_ID) &&
      Boolean(import.meta.env.VITE_ASGARDEO_BASE_URL) &&
      Boolean(import.meta.env.VITE_ASGARDEO_SIGN_IN_REDIRECT_URL);
    return cfgOk;
  }, []);

  useEffect(() => {
    // If already authenticated via Asgardeo AND we have a backend user ID, go to app.
    // This prevents a loop where Asgardeo is happy but RequireAuth (checking ID) is not.
    if ((state as any)?.isAuthenticated && getUserId()) {
      nav("/app/dashboard");
    }
  }, [(state as any)?.isAuthenticated, nav]);

  async function submitDev(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      // ensure we don't keep OIDC token while using dev mode
      clearAccessToken();
      const user = await devLogin(email.trim());
      setUserId(user.id);
      nav("/app/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitAsgardeo() {
    setErr(null);
    setBusy(true);
    try {
      // ensure we don't keep dev user while using Asgardeo
      clearUserId();
      await signIn();
      // redirect happens to /callback; if popup flow, this might return here
    } catch (e: any) {
      setErr(e?.message || "Asgardeo sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight">Welcome back</div>
          <div className="text-sm text-zinc-400 mt-1">
            Sign in to continue. Choose Dev login (for testing) or Asgardeo (SSO).
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-6 shadow-sm space-y-4">
          {/* Asgardeo */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-200" />
                  Secure login (Asgardeo)
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Recommended — supports Google / Email / SSO.
                </div>
              </div>

              <button
                type="button"
                disabled={busy || !asgardeoReady}
                onClick={submitAsgardeo}
                className={[
                  "h-10 px-4 rounded-xl font-medium border flex items-center gap-2",
                  asgardeoReady
                    ? "bg-indigo-500/90 hover:bg-indigo-500 border-indigo-400/30"
                    : "bg-white/5 border-white/10 text-zinc-500 cursor-not-allowed",
                ].join(" ")}
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : null}
                Continue
                <ArrowRight size={16} />
              </button>
            </div>

            {!asgardeoReady && (
              <div className="text-xs text-zinc-500 mt-3">
                Asgardeo env vars missing. Check <code className="text-zinc-300">VITE_ASGARDEO_*</code> in{" "}
                <code className="text-zinc-300">mindpath-ui/.env</code> and restart <code className="text-zinc-300">npm run dev</code>.
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px bg-white/10 flex-1" />
            <div className="text-xs text-zinc-500">or</div>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          {/* Dev Login */}
          <div className="space-y-4">
            {/* Quick Admin Button */}
            <button
              type="button"
              onClick={() => {
                setEmail("admin@mindpath.ai");
                setPassword("123456"); // Dummy UI password
                // Auto-submit logic would require form ref or state trigger, 
                // but pre-filling is good enough for "easy dev login".
                // Actually, let's just call submitDev directly if we can, or let user click.
                // Let's just pre-fill.
              }}
              className="w-full h-9 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-medium border border-indigo-500/20"
            >
              🪄 Quick Fill: Admin
            </button>

            <form onSubmit={submitDev} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500">Email (dev)</label>
                <div className="mt-1 relative">
                  <Mail size={16} className="absolute left-3 top-3 text-zinc-500" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-950/40 border border-white/10 outline-none focus:border-indigo-400/40"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500">Password (UI-only)</label>
                <div className="mt-1 relative">
                  <Lock size={16} className="absolute left-3 top-3 text-zinc-500" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-950/40 border border-white/10 outline-none focus:border-indigo-400/40"
                    autoComplete="current-password"
                  />
                </div>
                <div className="text-[11px] text-zinc-500 mt-2">
                  Dev login uses email only (backend <code className="text-zinc-300">/api/auth/dev-login</code>).
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  className="text-sm text-indigo-300 hover:text-indigo-200"
                  onClick={() => alert("UI-only. Add password reset later.")}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : null}
                Dev sign in
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-4 text-sm text-zinc-400">
          Don’t have an account?{" "}
          <Link to="/register" className="text-indigo-300 hover:text-indigo-200">
            Create one
          </Link>
        </div>

        <div className="mt-6 text-xs text-zinc-500">
          This platform is for wellness support and self-reflection. It does not replace professional care.
        </div>
      </div>
    </div>
  );
}
