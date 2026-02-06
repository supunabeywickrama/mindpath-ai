// src/pages/Login.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // UI-only: later replace with Asgardeo OIDC redirect
    nav("/app/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight">Welcome back</div>
          <div className="text-sm text-zinc-400 mt-1">
            Sign in to continue. (Asgardeo login will be added later)
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-6 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500">Email</label>
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
              <label className="text-xs text-zinc-500">Password</label>
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
              className="w-full h-11 rounded-xl bg-indigo-500/90 hover:bg-indigo-500 border border-indigo-400/30 font-medium flex items-center justify-center gap-2"
            >
              Sign in
              <ArrowRight size={16} />
            </button>

            <div className="pt-3 border-t border-white/10">
              <button
                type="button"
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-medium"
                onClick={() => alert("UI-only. Social login via Asgardeo later.")}
              >
                Continue with Google (later)
              </button>
              <div className="text-xs text-zinc-500 mt-2">
                Later: Asgardeo will handle Google / Email / SSO.
              </div>
            </div>
          </form>
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
