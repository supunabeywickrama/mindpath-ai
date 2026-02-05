import Card from "../components/Card";
import Button from "../components/Button";
import { useAppStore } from "../store/useAppStore";
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

function ymd(iso: string) {
  return iso.slice(0, 10);
}

function lastNDays(entries: {
    tags: any; date: string; mood: number 
}[], n: number) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-n);
}

export default function Insights() {
  const { state } = useAppStore();

  const mood = state.mood;
  const last14 = lastNDays(mood, 14);

  const lineData = last14.map((m) => ({
    day: ymd(m.date).slice(5),
    mood: m.mood,
  }));

  const avg =
    last14.length === 0 ? 0 : last14.reduce((s, x) => s + x.mood, 0) / last14.length;

  // Tag frequency (e.g., sleep_poor, stress_high) from last 14
  const tagKeys = ["sleep_poor", "stress_high", "low_activity", "social", "caffeine"];
  const tagCounts = tagKeys.map((k) => ({
    tag:
      k === "sleep_poor"
        ? "Poor sleep"
        : k === "stress_high"
        ? "High stress"
        : k === "low_activity"
        ? "Low activity"
        : k === "social"
        ? "Social time"
        : "Caffeine",
    count: last14.filter((m) => m.tags?.[k]).length,
  }));

  // Very simple “pattern” hints (mock logic)
  const poorSleepDays = last14.filter((m) => m.tags?.sleep_poor).length;
  const highStressDays = last14.filter((m) => m.tags?.stress_high).length;

  const insightCards = [
    {
      title: "Mood average (14 days)",
      value: `${Math.round(avg * 10) / 10}/10`,
      hint: avg < 4 ? "Lower than usual — keep goals tiny." : "Steady — protect your routine.",
    },
    {
      title: "Poor sleep tags",
      value: `${poorSleepDays} days`,
      hint: poorSleepDays >= 4 ? "Sleep is a big lever. Try a consistent bedtime." : "Nice — keep it consistent.",
    },
    {
      title: "High stress tags",
      value: `${highStressDays} days`,
      hint: highStressDays >= 4 ? "Stress is showing up often. Try a 2-minute reset." : "Good — keep boundaries.",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Insights</h1>
          <p className="text-zinc-400 mt-1">
            Trends and gentle patterns based on your recent logs.
          </p>
        </div>
        <Button variant="secondary" disabled>
          Export report (later)
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insightCards.map((c) => (
          <Card key={c.title} title={c.title}>
            <div className="text-3xl font-semibold">{c.value}</div>
            <div className="text-sm text-zinc-400 mt-2">{c.hint}</div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Mood trend" subtitle="Last 14 entries">
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
        </Card>

        <Card title="Context tags" subtitle="How often tags appear (last 14 entries)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tagCounts}>
                <XAxis dataKey="tag" stroke="rgba(255,255,255,0.35)" />
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
          <div className="text-xs text-zinc-500 mt-3">
            These are not diagnoses — just patterns from your own tags.
          </div>
        </Card>
      </div>

      {/* Pattern suggestions */}
      <Card title="Suggested focus" subtitle="Small, practical recommendations (mock)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="font-semibold">Sleep anchor</div>
            <div className="text-sm text-zinc-400 mt-1">
              Pick one fixed wake-up time for 3 days. Keep it gentle.
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="font-semibold">2-minute reset</div>
            <div className="text-sm text-zinc-400 mt-1">
              Breathe in 4 seconds, out 6 seconds. Repeat 5 times.
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="font-semibold">One connection</div>
            <div className="text-sm text-zinc-400 mt-1">
              Send one message: “Hey, can we talk later?”
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
