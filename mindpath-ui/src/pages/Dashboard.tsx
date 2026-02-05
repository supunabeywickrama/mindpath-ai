import Card from "../components/Card";
import Button from "../components/Button";
import { useAppStore } from "../store/useAppStore";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function ymd(iso: string) {
  return iso.slice(0, 10);
}

export default function Dashboard() {
  const { state } = useAppStore();

  const moodSorted = [...state.mood].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = moodSorted.slice(-7);

  const chartData = last7.map((m) => ({
    day: ymd(m.date).slice(5),
    mood: m.mood,
  }));

  const avg =
    last7.length === 0
      ? 0
      : Math.round((last7.reduce((s, x) => s + x.mood, 0) / last7.length) * 10) / 10;

  const today = ymd(new Date().toISOString());
  const habitsDoneToday = state.habits.filter((h) => h.completedDates.includes(today)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            Your week at a glance — mood, habits, and gentle progress.
          </p>
        </div>

        <div className="flex gap-2">
          <Link to="/app/mood"><Button>Log mood</Button></Link>
          <Link to="/app/chat"><Button variant="secondary">Talk to AI</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Weekly average mood" subtitle="Last 7 entries">
          <div className="text-3xl font-semibold">{avg}/10</div>
          <div className="text-sm text-zinc-400 mt-1">Small steps count. Keep it gentle.</div>
        </Card>

        <Card title="Habits today" subtitle={`Completed ${habitsDoneToday} / ${state.habits.length}`}>
          <div className="text-3xl font-semibold">
            {habitsDoneToday}/{state.habits.length}
          </div>
          <div className="text-sm text-zinc-400 mt-1">Even 1 habit is a win.</div>
        </Card>

        <Card title="Plan" subtitle="Subscription status">
          <div className="text-3xl font-semibold capitalize">{state.plan}</div>
          <div className="mt-3">
            <Link to="/app/pricing"><Button variant="ghost">Manage plan</Button></Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Mood trend" subtitle="Last 7 days">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" />
                <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.4)" />
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

        <Card
          title="Quick suggestions"
          subtitle="Simple things you can try today"
          right={<span className="text-xs text-zinc-500">Mock</span>}
        >
          <ul className="space-y-2 text-sm">
            <li className="rounded-xl bg-white/5 border border-white/10 p-3">
              Take 5 slow breaths (in 4s, out 6s).
            </li>
            <li className="rounded-xl bg-white/5 border border-white/10 p-3">
              Step outside for 3 minutes of daylight.
            </li>
            <li className="rounded-xl bg-white/5 border border-white/10 p-3">
              Message one trusted person: “Hey, can we talk later?”
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
