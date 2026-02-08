import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";

import { apiGetAuth } from "../lib/api";
import { useAuthContext } from "@asgardeo/auth-react";
//import { useEffect, useState } from "react";



import Button from "../components/Button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

type InsightsSummary = {
  days: number;
  mood_avg: number | null;
  mood_min: number | null;
  mood_max: number | null;
  mood_count: number;
  top_emotions: string[];
  top_tags: string[];
  journal_count: number;
  themes: string[];
  suggestions: string[];
  ai_summary: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID ?? "4";

function ymd(iso: string) {
  return iso.slice(0, 10);
}

export default function Insights() {
  const { getAccessToken } = useAuthContext();
  const [data, setData] = useState<InsightsSummary | null>(null);

  // Prefetch summary for cache warmer (optional)
  useEffect(() => {
    (async () => {
      // Logic merged into loadSummary ideally, but keeping side-effect for consistency
      await apiGetAuth(`/api/insights/summary?days=7`, getAccessToken);
    })();
  }, [getAccessToken]);

  const [days, setDays] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadSummary(d: number) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/insights/summary?days=${d}`, {
        headers: {
          "X-User-Id": String(DEV_USER_ID),
        },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Request failed");
      }
      const json = (await res.json()) as InsightsSummary;
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load insights");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary(days);
  }, [days]);

  const lineData = useMemo(() => {
    if (!data || data.mood_count <= 0) return [];
    // We don't have per-day timeseries from backend yet; use a simple placeholder series
    // using avg/min/max for a lightweight chart. Later: add /api/insights/timeseries.
    const avg = data.mood_avg ?? 0;
    const min = data.mood_min ?? avg;
    const max = data.mood_max ?? avg;

    const points = [
      { day: "D-6", mood: avg },
      { day: "D-5", mood: avg },
      { day: "D-4", mood: avg },
      { day: "D-3", mood: avg },
      { day: "D-2", mood: avg },
      { day: "D-1", mood: avg },
      { day: "Today", mood: avg },
    ];

    // Add a tiny variation hint using min/max so chart isn't perfectly flat
    if (data.mood_count >= 3) {
      points[1].mood = Math.max(0, Math.min(10, (avg + min) / 2));
      points[5].mood = Math.max(0, Math.min(10, (avg + max) / 2));
    }
    return points;
  }, [data]);

  const emotionBars = useMemo(() => {
    const arr = (data?.top_emotions ?? []).slice(0, 6);
    return arr.map((x, i) => ({ label: x, count: 6 - i }));
  }, [data]);

  const tagBars = useMemo(() => {
    const arr = (data?.top_tags ?? []).slice(0, 6);
    return arr.map((x, i) => ({ label: x, count: 6 - i }));
  }, [data]);

  const kpis = useMemo(() => {
    const avg = data?.mood_avg;
    const avgText = avg == null ? "—" : `${Math.round(avg * 10) / 10}/10`;

    const moodHint =
      avg == null
        ? "Add a few mood logs to unlock trends."
        : avg < 4
          ? "Lower range — keep goals tiny and protect rest."
          : avg < 7
            ? "Moderate range — protect your routine and basics."
            : "Good range — reinforce what’s working.";

    return [
      {
        title: `Mood average (${days} days)`,
        value: avgText,
        hint: moodHint,
      },
      {
        title: "Mood range",
        value:
          data?.mood_min == null || data?.mood_max == null
            ? "—"
            : `${data.mood_min} → ${data.mood_max}`,
        hint: "Range can help spot volatility over time.",
      },
      {
        title: "Entries logged",
        value: `${data?.mood_count ?? 0} moods • ${data?.journal_count ?? 0} journals`,
        hint: "More consistent logs = clearer patterns.",
      },
    ];
  }, [data, days]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Insights</h1>
          <p className="text-zinc-400 mt-1">
            Trends and gentle patterns based on your recent logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-2xl bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => setDays(7)}
              className={[
                "px-3 py-1.5 rounded-xl text-sm transition",
                days === 7 ? "bg-white/10" : "hover:bg-white/10 text-zinc-300",
              ].join(" ")}
            >
              7 days
            </button>
            <button
              onClick={() => setDays(30)}
              className={[
                "px-3 py-1.5 rounded-xl text-sm transition",
                days === 30 ? "bg-white/10" : "hover:bg-white/10 text-zinc-300",
              ].join(" ")}
            >
              30 days
            </button>
          </div>

          <Button variant="secondary" disabled>
            Export report (later)
          </Button>
        </div>
      </div>

      {err && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 p-4 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((c) => (
          <Card key={c.title} title={c.title}>
            <div className="text-3xl font-semibold">{loading ? "…" : c.value}</div>
            <div className="text-sm text-zinc-400 mt-2">{c.hint}</div>
          </Card>
        ))}
      </div>

      {/* AI Summary */}
      <Card title="Weekly note" subtitle="Short summary (AI-assisted when available)">
        {loading ? (
          <div className="text-sm text-zinc-400">Loading summary…</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {data?.ai_summary ||
                "Keep logging a little each day. Once you have a week of entries, you'll start seeing clearer patterns."}
            </div>

            <div className="text-xs text-zinc-500">
              Not a medical service. Insights reflect your logs and may be incomplete.
            </div>
          </div>
        )}
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Mood trend" subtitle={`Last ${days} days (summary view)`}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.35)" />
                <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.35)" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(24,24,27,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                />
                <Line type="monotone" dataKey="mood" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-zinc-500 mt-3">
            Next: add a real time-series endpoint so this chart matches daily logs.
          </div>
        </Card>

        <Card title="Top emotions & tags" subtitle="Most frequent items in your logs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="h-56 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-zinc-500 mb-2">Emotions</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emotionBars}>
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" />
                  <YAxis stroke="rgba(255,255,255,0.35)" />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(24,24,27,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-56 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-zinc-500 mb-2">Tags</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagBars}>
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" />
                  <YAxis stroke="rgba(255,255,255,0.35)" />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(24,24,27,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(data?.themes ?? []).slice(0, 10).map((t) => (
              <span
                key={t}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300"
              >
                {t}
              </span>
            ))}
            {(data?.themes?.length ?? 0) === 0 && (
              <span className="text-xs text-zinc-500">
                No clear themes yet — add a few journal entries.
              </span>
            )}
          </div>

          <div className="text-xs text-zinc-500 mt-3">
            These are not diagnoses — just patterns from your own logs.
          </div>
        </Card>
      </div>

      {/* Suggested focus */}
      <Card title="Suggested focus" subtitle="Small, practical recommendations">
        {loading ? (
          <div className="text-sm text-zinc-400">Loading suggestions…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(data?.suggestions ?? []).slice(0, 3).map((s, idx) => (
              <div key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="font-semibold">Suggestion {idx + 1}</div>
                <div className="text-sm text-zinc-400 mt-1">{s}</div>
              </div>
            ))}
            {(data?.suggestions?.length ?? 0) === 0 && (
              <div className="text-sm text-zinc-500">No suggestions yet.</div>
            )}
          </div>
        )}
      </Card>

      <div className="text-xs text-zinc-500">
        Data window ends on {ymd(new Date().toISOString())}. User: {String(DEV_USER_ID)}.
      </div>
    </div>
  );
}
