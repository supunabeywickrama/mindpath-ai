import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { listMoods, listJournal, type MoodOut, type JournalOut } from "../lib/api";
import {
  ArrowUpRight,
  RefreshCw,
  Smile,
  BookOpen,
  MessageSquare,
  Sparkles,
  Flame,
  Moon,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function moodLabel(m: number) {
  if (m >= 7) return "Good";
  if (m >= 4) return "Okay";
  return "Low";
}

function moodTone(m: number) {
  if (m >= 7) return "bg-emerald-500/15 border-emerald-400/20 text-emerald-100";
  if (m >= 4) return "bg-indigo-500/15 border-indigo-400/20 text-indigo-100";
  return "bg-amber-500/15 border-amber-400/20 text-amber-100";
}

function ymd(iso: string) {
  return iso.slice(0, 10);
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

  const last14 = useMemo(() => {
    const sorted = [...moods].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return sorted.slice(-14);
  }, [moods]);

  const chartData = useMemo(() => {
    return last14.map((m) => ({
      day: ymd(m.created_at).slice(5),
      mood: m.mood,
    }));
  }, [last14]);

  const avg7 = useMemo(() => {
    const last7 = moods.slice(0, 7);
    if (!last7.length) return null;
    const sum = last7.reduce((acc, x) => acc + x.mood, 0);
    return Math.round((sum / last7.length) * 10) / 10;
  }, [moods]);

  const trend = useMemo(() => {
    const last7 = [...moods.slice(0, 7)].reverse();
    if (last7.length < 4) return null;
    const firstHalf = last7.slice(0, Math.floor(last7.length / 2));
    const secondHalf = last7.slice(Math.floor(last7.length / 2));
    const a =
      firstHalf.reduce((s, x) => s + x.mood, 0) / Math.max(1, firstHalf.length);
    const b =
      secondHalf.reduce((s, x) => s + x.mood, 0) / Math.max(1, secondHalf.length);
    const delta = Math.round((b - a) * 10) / 10;
    return delta;
  }, [moods]);

  const weekFlags = useMemo(() => {
    const last7 = moods.slice(0, 7);
    const stress = last7.filter((x) => (x.tags as any)?.stress_high).length;
    const sleep = last7.filter((x) => (x.tags as any)?.sleep_poor).length;
    return { stress, sleep };
  }, [moods]);

  const focus = useMemo(() => {
    if (!moods.length) {
      return {
        title: "Start small",
        body: "Log your mood once per day for a week to unlock patterns.",
        icon: Activity,
      };
    }
    if (weekFlags.sleep >= 4) {
      return {
        title: "Sleep anchor",
        body: "Try a consistent wake-up time for 3 days. Keep it gentle.",
        icon: Moon,
      };
    }
    if (weekFlags.stress >= 4) {
      return {
        title: "Stress reset",
        body: "Do 60 seconds: inhale 4s, exhale 6s × 5 cycles.",
        icon: Flame,
      };
    }
    return {
      title: "Protect what’s working",
      body: "Pick one small routine to keep steady for the next 3 days.",
      icon: TrendingUp,
    };
  }, [moods, weekFlags.sleep, weekFlags.stress]);

  const QuickTile = ({
    to,
    title,
    desc,
    icon: Icon,
  }: {
    to: string;
    title: string;
    desc: string;
    icon: any;
  }) => (
    <Link to={to} className="group block">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Icon size={18} className="text-zinc-200" />
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-zinc-500 mt-1">{desc}</div>
            </div>
          </div>
          <ArrowUpRight size={16} className="text-zinc-500 group-hover:text-zinc-300 transition" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            Your snapshot — gentle insights from your recent logs.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={16} />
              Refresh
            </span>
          </Button>
          <Link to="/app/mood">
            <Button disabled={loading}>
              <span className="inline-flex items-center gap-2">
                <Smile size={16} />
                Log mood
              </span>
            </Button>
          </Link>
        </div>
      </div>

      {err && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <div className="rounded-3xl bg-gradient-to-b from-indigo-500/15 to-transparent border border-indigo-400/15 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-300">Today</div>
                <div className="text-xl font-semibold mt-1">
                  {loading ? "Loading..." : "How are you, right now?"}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {latestMood ? `Last check-in: ${fmtTime(latestMood.created_at)}` : "No mood logged yet"}
                </div>
              </div>
              <Link to="/app/chat">
                <button className="h-10 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm inline-flex items-center gap-2">
                  <Sparkles size={16} />
                  Talk to AI
                </button>
              </Link>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-xs text-zinc-500">Latest mood</div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-3xl font-semibold">
                      {loading ? "—" : latestMood ? latestMood.mood : "—"}
                      {latestMood ? <span className="text-base text-zinc-400">/10</span> : null}
                    </div>
                    {latestMood && (
                      <span className={`text-xs px-2 py-1 rounded-full border ${moodTone(latestMood.mood)}`}>
                        {moodLabel(latestMood.mood)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    {latestMood ? (latestMood.note ? `Note: ${latestMood.note}` : "No note") : "No entries yet"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-xs text-zinc-500">7-entry average</div>
                  <div className="mt-2 text-3xl font-semibold">{loading ? "—" : avg7 ?? "—"}</div>
                  <div className="text-xs text-zinc-500 mt-2">
                    Based on last {Math.min(7, moods.length)} mood logs
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-xs text-zinc-500">7-day trend</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <div className="text-3xl font-semibold">
                      {loading ? "—" : trend == null ? "—" : trend > 0 ? `+${trend}` : `${trend}`}
                    </div>
                    <div className="text-sm text-zinc-400">points</div>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    {trend == null
                      ? "Need more logs for trend."
                      : trend > 0
                      ? "Improving direction — keep basics steady."
                      : trend < 0
                      ? "Downward direction — keep goals tiny and rest."
                      : "Stable — protect your routine."}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Mood curve</div>
                  <div className="text-xs text-zinc-500">Last 14 entries</div>
                </div>
                <div className="h-56 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <XAxis dataKey="day" stroke="rgba(255,255,255,0.35)" />
                      <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.35)" />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(24,24,27,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                        }}
                      />
                      <Area type="monotone" dataKey="mood" strokeWidth={2} fillOpacity={0.15} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  Not a diagnosis — just patterns from your own check-ins.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions + Focus */}
        <div className="lg:col-span-4 space-y-4">
          <Card title="Quick actions" subtitle="One tap to move forward">
            <div className="space-y-3">
              <QuickTile to="/app/mood" title="Log mood" desc="30 seconds check-in." icon={Smile} />
              <QuickTile to="/app/journal" title="Write journal" desc="2–3 sentences is enough." icon={BookOpen} />
              <QuickTile to="/app/chat" title="AI Assistant" desc="Talk it out — short steps." icon={MessageSquare} />
            </div>
          </Card>

          <Card title="Suggested focus" subtitle="Based on your recent logs">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <focus.icon size={18} className="text-zinc-200" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{focus.title}</div>
                  <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{focus.body}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-zinc-500">Stress high</div>
                  <div className="text-lg font-semibold mt-1">{loading ? "—" : weekFlags.stress}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-xs text-zinc-500">Sleep poor</div>
                  <div className="text-lg font-semibold mt-1">{loading ? "—" : weekFlags.sleep}</div>
                </div>
              </div>

              <div className="mt-3 text-xs text-zinc-500">
                Counts from last {Math.min(7, moods.length)} mood logs.
              </div>
            </div>
          </Card>

          <Card
            title="Last journal entry"
            subtitle={latestJournal ? fmtTime(latestJournal.created_at) : "No entries yet"}
            right={
              <Link to="/app/journal">
                <Button variant="secondary">Open</Button>
              </Link>
            }
          >
            {!latestJournal ? (
              <div className="text-sm text-zinc-400">You haven’t written any journal entries yet.</div>
            ) : (
              <div className="space-y-2">
                <div className="text-lg font-semibold line-clamp-1">{latestJournal.title}</div>
                <div className="text-sm text-zinc-200 whitespace-pre-wrap line-clamp-4">
                  {latestJournal.content}
                </div>

                {latestJournal.emotions?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {latestJournal.emotions.slice(0, 6).map((e) => (
                      <span
                        key={e}
                        className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300"
                      >
                        {e}
                      </span>
                    ))}
                    {latestJournal.emotions.length > 6 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                        +{latestJournal.emotions.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Next step" subtitle="Keep it small">
          <div className="text-sm text-zinc-300 leading-relaxed">
            If today feels heavy: choose <span className="text-zinc-100 font-semibold">one tiny task</span>, then rest.
          </div>
          <div className="mt-4 flex gap-2">
            <Link to="/app/mood">
              <button className="h-10 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm inline-flex items-center gap-2">
                <Smile size={16} />
                Mood
              </button>
            </Link>
            <Link to="/app/journal">
              <button className="h-10 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm inline-flex items-center gap-2">
                <BookOpen size={16} />
                Journal
              </button>
            </Link>
          </div>
        </Card>

        <Card title="AI + RAG" subtitle="Grounded support">
          <div className="text-sm text-zinc-300 leading-relaxed">
            Your assistant uses knowledge snippets + your memories to keep replies consistent and personalized.
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            (Later: show sources + confidence.)
          </div>
        </Card>

        <Card title="Account" subtitle="Authentication later">
          <div className="text-sm text-zinc-300 leading-relaxed">
            Next big step: replace dev auth with Asgardeo (OIDC/JWT) and user profiles.
          </div>
        </Card>
      </div>
    </div>
  );
}
