import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="text-3xl font-semibold">MindPath</div>
        <p className="text-zinc-400 mt-2">
          A calm, AI-supported wellness companion (UI-first build).
        </p>
        <div className="mt-6 flex gap-2">
          <Link to="/login" className="px-4 py-2 rounded-xl bg-indigo-500/90">Login</Link>
          <Link to="/app/dashboard" className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">Open App</Link>
        </div>
      </div>
    </div>
  );
}
