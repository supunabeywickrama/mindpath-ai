import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2, LogIn } from "lucide-react";
import { login, setAccessToken, setUserId, getMe, getUserId, clearAccessToken, clearUserId } from "../lib/api";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, redirect
    if (getUserId()) {
      nav("/app/dashboard");
    }
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      // Clear old state
      clearAccessToken();
      clearUserId();

      // Login
      const { access_token } = await login(email, password);
      setAccessToken(access_token);

      // Get User Profile
      const user = await getMe();
      setUserId(user.id);

      nav("/app/dashboard", { replace: true });
    } catch (e: any) {
      console.error(e);
      setErr(e.message || "Invalid email or password");
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
            Sign in to your MindPath account.
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-6 shadow-sm space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500">Email</label>
              <div className="mt-1 relative">
                <Mail size={16} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-950/40 border border-white/10 outline-none focus:border-indigo-400/40"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500">Password</label>
              <div className="mt-1 relative">
                <Lock size={16} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-950/40 border border-white/10 outline-none focus:border-indigo-400/40"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-500"
                />
                Remember me
              </label>

              <button
                type="button"
                className="text-sm text-indigo-300 hover:text-indigo-200"
                onClick={() => alert("Not implemented yet.")}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl bg-indigo-500/90 hover:bg-indigo-500 border border-indigo-400/30 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
              Sign In
            </button>
          </form>

          {/* Quick Fill for Dev Convenience */}
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => {
                setEmail("admin@mindpath.ai");
                setPassword("admin123");
              }}
              className="w-full h-8 mt-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 text-xs"
            >
              🪄 Quick Fill: Admin
            </button>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-zinc-400">
          Don’t have an account?{" "}
          <Link to="/register" className="text-indigo-300 hover:text-indigo-200">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
