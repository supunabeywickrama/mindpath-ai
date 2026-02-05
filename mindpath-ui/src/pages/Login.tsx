import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-zinc-900/60 border border-white/10 p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-zinc-400 mt-1">Asgardeo later. Placeholder now.</p>
        <div className="mt-6">
          <Link to="/app/dashboard" className="block text-center px-4 py-2 rounded-xl bg-indigo-500/90">
            Continue
          </Link>
        </div>
        <div className="mt-4 text-sm text-zinc-400">
          No account? <Link to="/register" className="text-indigo-300">Register</Link>
        </div>
      </div>
    </div>
  );
}
