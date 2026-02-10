import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";

import { apiGetAuth, apiPostAuth, getUserId } from "../lib/api";
import { useAuthContext } from "@asgardeo/auth-react";

import Button from "../components/Button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
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

function ymd(iso: string) {
  return iso.slice(0, 10);
}

export default function Insights() {
  const { getAccessToken } = useAuthContext();
  const [data, setData] = useState<InsightsSummary | null>(null);
  const [trendData, setTrendData] = useState<{ day: string; mood: number }[]>([]);

  // Prefetch (optional)
  useEffect(() => {
    (async () => {
      try {
        await apiGetAuth(`/api/insights/summary?days=7`, getAccessToken);
      } catch (e) {
        // quiet error
      }
    })();
  }, [getAccessToken]);

  const [days, setDays] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function loadSummary(d: number) {
    setLoading(true);
    setErr(null);
    try {
      let token = "";
      try {
        token = await getAccessToken();
      } catch (e) {
        // Not logged in, or error getting token
      }

      const headers: HeadersInit = {};

      // 1. Try Token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 2. Always fallback to X-User-Id from localStorage if available (matches Dashboard behavior)
      // This ensures that if we are in local/dev mode without a token, we still get the correct user.
      const localUserId = getUserId();
      if (localUserId) {
        headers['X-User-Id'] = localUserId;
      } else {
        // 3. Last resort: VITE_DEV_USER_ID
        const devId = import.meta.env.VITE_DEV_USER_ID ?? "4";
        if (devId) {
          headers['X-User-Id'] = devId;
        }
      }

      // Fetch Summary
      const res = await fetch(`${API_BASE}/api/insights/summary?days=${d}`, { headers });
      if (!res.ok) {
        if (res.status === 401) throw new Error("The user must be authenticated first.");
        throw new Error("Failed to load insights");
      }
      const json = await res.json();
      setData(json);

      // Load trend data
      try {
        const trendRes = await fetch(`${API_BASE}/api/insights/trend?days=${d}`, { headers });
        if (trendRes.ok) {
          const trendJson = await trendRes.json();
          setTrendData(trendJson);
        } else {
          setTrendData([]);
        }
      } catch (trendErr) {
        console.error("Failed to load trend", trendErr);
        setTrendData([]);
      }

    } catch (e: any) {
      setErr(e?.message ?? "Failed to load insights");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary(days);
  }, [days, getAccessToken]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      let token = "";
      try { token = await getAccessToken(); } catch (e) { }

      const userId = getUserId() || (import.meta.env.VITE_DEV_USER_ID ?? "4");

      const headers: HeadersInit = { "X-User-Id": userId! };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/insights/export/pdf?days=${days}`, {
        headers
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mindpath-insights-${days}d.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Failed to download PDF");
    } finally {
      setExporting(false);
    }
  }

  async function handleEmailReport() {
    setExporting(true);
    try {
      let token = "";
      try { token = await getAccessToken(); } catch (e) { }

      const userId = getUserId() || (import.meta.env.VITE_DEV_USER_ID ?? "4");

      const headers: HeadersInit = {
        "X-User-Id": userId!,
        "Content-Type": "application/json"
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/insights/export/email?days=${days}`, {
        method: "POST",
        headers,
        body: JSON.stringify({})
      });

      if (!res.ok) throw new Error("Failed to send email");

      alert("Report sent to your email!");
    } catch (e) {
      console.error(e);
      alert("Failed to send email");
    } finally {
      setExporting(false);
    }
  }

  const lineData = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      // Fallback to placeholder if no trend data but we have summary data
      if (!data || data.mood_count <= 0) return [];
      const avg = data.mood_avg ?? 0;
      return [
        { day: "D-6", mood: avg },
        { day: "Today", mood: avg },
      ];
    }
    return trendData.map((d) => ({
      day: d.day.slice(5), // 2023-10-25 -> 10-25
      mood: d.mood
    }));
  }, [trendData, data]);

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

          <Button variant="secondary" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
          <Button variant="secondary" onClick={handleEmailReport} disabled={exporting}>
            Email
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
        <Card title="Mood trend" subtitle={`Last ${days} days (daily average)`}>
          <div className="h-64">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.35)" />
                  <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.35)" />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(24,24,27,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="#818cf8"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorMood)"
                    dot={{ r: 4, fill: "#818cf8", strokeWidth: 2, stroke: "#18181b" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="text-xs text-zinc-500 mt-3">
            Shows your average daily mood.
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
        Data window ends on {ymd(new Date().toISOString())}.
      </div>
    </div>
  );
}
