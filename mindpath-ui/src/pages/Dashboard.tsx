import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { listMoods, listJournal, type MoodOut, type JournalOut } from "../lib/api";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function moodLabel(m: number) {
  if (m >= 7) return "Good";
  if (m >= 4) return "Okay";
  return "Low";
}

export default function Dashboard() {
  const [moods, setMoods] = useState<MoodOut[]>([]);
  const [journals, setJournals] = useState<JournalOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [m, j] = await Promise.all([listMoods(), listJournal()]);
      setMoods(m);
      setJournals(j);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const latestMood = moods?.[0] ?? null;
  const latestJournal = journals?.[0] ?? null;

  const avg7 = useMemo(() => {
    const last7 = moods.slice(0, 7);
    if (!last7.length) return null;
    const sum = last7.reduce((acc, x) => acc + x.mood, 0);
    return Math.round((sum / last7.length) * 10) / 10;
  }, [moods]);

  const weekFlags = useMemo(() => {
    const last7 = moods.slice(0, 7);
    const stress = last7.filter((x) => x.tags?.stress_high).length;
    const sleep = last7.filter((x) => x.tags?.sleep_poor).length;
    return { stress, sleep };
  }, [moods]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Your snapshot (data from database).</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
          <Link to="/app/mood">
            <Button>Log mood</Button>
          </Link>
        </div>
      </div>

      {err && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-4">
          <Card title="Today" subtitle={loading ? "Loading..." : "Quick view"}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-zinc-500">Latest mood</div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="text-3xl font-semibold">
                    {latestMood ? latestMood.mood : "—"}
                    {latestMood ? <span className="text-base text-zinc-400">/10</span> : null}
                  </div>
                  {latestMood && (
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20">
                      {moodLabel(latestMood.mood)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  {latestMood ? fmtTime(latestMood.created_at) : "No entries yet"}
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-zinc-500">7-entry average</div>
                <div className="mt-2 text-3xl font-semibold">{avg7 ?? "—"}</div>
                <div className="text-xs text-zinc-500 mt-2">
                  Based on your last {Math.min(7, moods.length)} mood logs
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-zinc-500">This week flags</div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">Stress high</span>
                    <span className="text-zinc-100 font-semibold">{weekFlags.stress}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">Sleep poor</span>
                    <span className="text-zinc-100 font-semibold">{weekFlags.sleep}</span>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 mt-2">Counts from last 7 mood logs</div>
              </div>
            </div>
          </Card>

          <Card
            title="Last journal entry"
            subtitle={latestJournal ? fmtTime(latestJournal.created_at) : "No entries yet"}
            right={
              <Link to="/app/journal">
                <Button variant="secondary">Open Journal</Button>
              </Link>
            }
          >
            {!latestJournal ? (
              <div className="text-sm text-zinc-400">
                You haven’t written any journal entries yet.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-lg font-semibold">{latestJournal.title}</div>
                <div className="text-sm text-zinc-200 whitespace-pre-wrap line-clamp-4">
                  {latestJournal.content}
                </div>
                {latestJournal.emotions?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {latestJournal.emotions.slice(0, 5).map((e) => (
                      <span
                        key={e}
                        className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300"
                      >
                        {e}
                      </span>
                    ))}
                    {latestJournal.emotions.length > 5 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                        +{latestJournal.emotions.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-4">
          <Card title="Quick actions" subtitle="Small steps">
            <div className="grid grid-cols-1 gap-3">
              <Link to="/app/mood" className="block">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition">
                  <div className="text-sm font-semibold">Log mood</div>
                  <div className="text-xs text-zinc-500 mt-1">30 seconds check-in.</div>
                </div>
              </Link>

              <Link to="/app/journal" className="block">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition">
                  <div className="text-sm font-semibold">Write journal</div>
                  <div className="text-xs text-zinc-500 mt-1">2–3 sentences is enough.</div>
                </div>
              </Link>

              <Link to="/app/chat" className="block">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition">
                  <div className="text-sm font-semibold">AI Assistant</div>
                  <div className="text-xs text-zinc-500 mt-1">Talk it out (AI next).</div>
                </div>
              </Link>
            </div>
          </Card>

          <Card title="What’s next" subtitle="Project roadmap">
            <div className="text-sm text-zinc-300 space-y-2">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                1) Replace mock AI with FastAPI AI endpoints
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                2) Add RAG for grounded advice (guidelines + user history)
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                3) Add Asgardeo authentication (OIDC/JWT)
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
