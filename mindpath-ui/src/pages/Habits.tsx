import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import {
  listHabits,
  createHabit,
  toggleHabit,
  deleteHabit,
  type Habit
} from "../lib/api";
import { CheckCircle2, Plus, Flame, CalendarDays, Trash2, X } from "lucide-react";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function weekdayLabel(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // New Habit Form
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = ymd(new Date());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const list = await listHabits();
      setHabits(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newGoal.trim()) return;
    setSubmitting(true);
    try {
      const h = await createHabit({ name: newName, goal: newGoal });
      setHabits([h, ...habits]);
      setAdding(false);
      setNewName("");
      setNewGoal("");
    } catch (e) {
      console.error(e);
      alert("Failed to create habit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id: number, date: string) {
    try {
      // Optimistic update
      setHabits(prev => prev.map(h => {
        if (h.id !== id) return h;
        const exists = h.completed_dates.includes(date);
        return {
          ...h,
          completed_dates: exists
            ? h.completed_dates.filter(d => d !== date)
            : [...h.completed_dates, date].sort()
        };
      }));

      await toggleHabit(id, date);
    } catch (e) {
      console.error(e);
      // Revert on error would go here, skipping for simplicity
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this habit?")) return;
    try {
      await deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  const week = useMemo(() => {
    const base = new Date();
    // last 7 days including today
    return Array.from({ length: 7 }).map((_, i) => addDays(base, -(6 - i)));
  }, []);

  const overview = useMemo(() => {
    const total = habits.length;
    let doneToday = 0;
    let streakSum = 0;

    for (const h of habits) {
      if (h.completed_dates.includes(today)) doneToday += 1;

      // streak = consecutive days ending today (or yesterday if not done today yet)
      let streak = 0;
      // Simple streak calc: check today, if done streak++ then check yesterday...
      // If today not done, check yesterday.
      // Actually simpler: just check backwards from today
      let current = new Date();
      if (!h.completed_dates.includes(ymd(current))) {
        // if not done today, check if done yesterday to sustain streak
        // if not done yesterday either, streak is 0.
        // Let's just strict check backwards from today?
        // Standard is: if done today, count=1 + prev. If not done today, count=0? 
        // Or is streak preserved if I missed today but did yesterday? Usually streak breaks if I miss a day.
        // Let's assume strict streak for simplicity: check today, yesterday, etc.
      }

      // Robust streak:
      let s = 0;
      const d = new Date();
      // Check up to 365 days back
      for (let i = 0; i < 365; i++) {
        const dateStr = ymd(addDays(d, -i));
        if (h.completed_dates.includes(dateStr)) {
          s++;
        } else {
          // If we are checking TODAY and it's not done, we shouldn't break streak yet if we did yesterday?
          // But "Current Streak" usually implies unbroken chain.
          // If I haven't done it TODAY, is my streak 0?
          // Usually apps show streak from yesterday if today is pending.
          if (i === 0) continue; // Skip today if not done, don't break yet
          break;
        }
      }
      streakSum += s;
    }

    const avgStreak = total ? Math.round((streakSum / total) * 10) / 10 : 0;
    const pct = total ? Math.round((doneToday / total) * 100) : 0;

    return { total, doneToday, pct, avgStreak };
  }, [habits, today]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Habits</h1>
          <p className="text-zinc-400 mt-1">Small actions. Low effort. High impact.</p>
        </div>

        {!adding && (
          <Button onClick={() => setAdding(true)}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              Add habit
            </span>
          </Button>
        )}
      </div>

      {/* Add Form */}
      {adding && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">New Habit</h3>
            <button onClick={() => setAdding(false)} className="text-zinc-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Name</label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Read 10 mins"
                className="w-full h-10 rounded-xl bg-zinc-950/50 border border-white/10 px-3 outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Goal / Motivation</label>
              <input
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
                placeholder="e.g. To learn effectively"
                className="w-full h-10 rounded-xl bg-zinc-950/50 border border-white/10 px-3 outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName || !newGoal || submitting}>
              {submitting ? "Creating..." : "Create Habit"}
            </Button>
          </div>
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Today progress" subtitle="How many habits you checked today">
          <div className="flex items-end justify-between">
            <div className="text-3xl font-semibold">
              {overview.doneToday}/{overview.total}
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20 text-indigo-100">
              {overview.pct}%
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Don’t chase perfection — consistency wins.
          </div>
        </Card>

        <Card title="Average streak" subtitle="Across your habits">
          <div className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{overview.avgStreak}</div>
            <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Flame size={18} className="text-zinc-200" />
            </div>
          </div>
          <div className="text-xs text-zinc-500 mt-2">Streak counts consecutive days ending today.</div>
        </Card>

        <Card title="This week" subtitle="Last 7 days overview">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <CalendarDays size={14} />
            {weekdayLabel(week[0])} → {weekdayLabel(week[6])}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const day = ymd(d);
              // overall completion score for that day
              const done = habits.filter((h) => h.completed_dates.includes(day)).length;
              const pct = habits.length ? done / habits.length : 0;

              const cls =
                pct >= 0.8
                  ? "bg-emerald-500/30 border-emerald-400/20"
                  : pct >= 0.4
                    ? "bg-indigo-500/25 border-indigo-400/20"
                    : pct > 0
                      ? "bg-amber-500/20 border-amber-400/20"
                      : "bg-white/5 border-white/10";

              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <div className="text-[11px] text-zinc-500">{weekdayLabel(d).slice(0, 2)}</div>
                  <div
                    className={`h-10 w-full rounded-xl border ${cls}`}
                    title={`${day}: ${done}/${habits.length} habits`}
                  />
                </div>
              );
            })}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Colors reflect how many habits you completed each day.
          </div>
        </Card>
      </div>

      {/* Habit cards */}
      {loading && <div className="text-center text-zinc-500 py-10">Loading habits...</div>}

      {!loading && habits.length === 0 && !adding && (
        <div className="text-center text-zinc-500 py-10 border border-dashed border-white/10 rounded-2xl">
          No habits yet. Start small by adding one!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {habits.map((h) => {
          const doneToday = h.completed_dates.includes(today);

          // streak (consecutive ending today)
          let streak = 0;
          const d = new Date();
          for (let i = 0; i < 365; i++) {
            const dateStr = ymd(addDays(d, -i));
            if (h.completed_dates.includes(dateStr)) {
              streak++;
            } else {
              if (i === 0) continue;
              break;
            }
          }

          // last 7 day completion for this habit
          const weekDone = week.map((d) => h.completed_dates.includes(ymd(d)));

          return (
            <Card
              key={h.id}
              title={h.name}
              subtitle={`Goal: ${h.goal}`}
              right={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(h.id, today)}
                    className={[
                      "px-3 py-1.5 rounded-xl text-sm border transition inline-flex items-center gap-2",
                      doneToday
                        ? "bg-emerald-500/15 border-emerald-400/30"
                        : "bg-white/5 border-white/10 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <CheckCircle2 size={16} className={doneToday ? "text-emerald-200" : "text-zinc-300"} />
                    {doneToday ? "Done today" : "Mark done"}
                  </button>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-white/5 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-zinc-400">
                  Completed: <span className="text-zinc-200 font-semibold">{h.completed_dates.length}</span> days
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                  Streak: <span className="font-semibold text-zinc-100">{streak}</span>
                </div>
              </div>

              {/* 7-day per-habit */}
              <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-zinc-500 mb-3">Last 7 days</div>
                <div className="grid grid-cols-7 gap-2">
                  {week.map((d, idx) => {
                    const day = ymd(d);
                    const on = weekDone[idx];
                    return (
                      <button
                        key={day}
                        onClick={() => handleToggle(h.id, day)}
                        className={[
                          "h-10 rounded-xl border transition",
                          on
                            ? "bg-emerald-500/25 border-emerald-400/20 hover:bg-emerald-500/30"
                            : "bg-white/5 border-white/10 hover:bg-white/10",
                        ].join(" ")}
                        title={`${day} (${weekdayLabel(d)}): ${on ? "Done" : "Not done"} — click to toggle`}
                      />
                    );
                  })}
                </div>
                <div className="text-xs text-zinc-500 mt-3">
                  Tip: click a day to toggle. (This also updates today’s streak.)
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
