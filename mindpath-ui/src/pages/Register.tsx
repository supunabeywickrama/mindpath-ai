import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, UserPlus } from "lucide-react";
import { register, setAccessToken, setUserId, getMe } from "../lib/api";

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters");

      const { access_token } = await register(email, password);
      console.log("Registered, token received");
      setAccessToken(access_token);

      const user = await getMe();
      console.log("User info loaded", user);
      setUserId(user.id);

      nav("/app/dashboard", { replace: true });
    } catch (e: any) {
      console.error(e);
      setErr(e.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight">Create an account</div>
          <div className="text-sm text-zinc-400 mt-1">Start your journey with MindPath.</div>
        </div>

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
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-950/40 border border-white/10 outline-none focus:border-indigo-400/40"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500">Password</label>
              <div className="mt-1 relative">
                <Lock size={16} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-950/40 border border-white/10 outline-none focus:border-indigo-400/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl bg-indigo-500/90 hover:bg-indigo-500 border border-indigo-400/30 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
              Sign Up
            </button>
          </form>
        </div>

        <div className="mt-4 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-300 hover:text-indigo-200">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
