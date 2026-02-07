import { useMemo } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAppStore } from "../store/useAppStore";
import { CheckCircle2, Plus, Flame, CalendarDays } from "lucide-react";

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
  const { state, toggleHabitDone } = useAppStore();
  const today = ymd(new Date());

  const week = useMemo(() => {
    const base = new Date();
    // last 7 days including today
    return Array.from({ length: 7 }).map((_, i) => addDays(base, -(6 - i)));
  }, []);

  const overview = useMemo(() => {
    const habits = state.habits ?? [];
    const total = habits.length;

    let doneToday = 0;
    let streakSum = 0;

    for (const h of habits) {
      if (h.completedDates.includes(today)) doneToday += 1;

      // streak = consecutive days ending today
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const d = ymd(addDays(new Date(), -i));
        if (h.completedDates.includes(d)) streak += 1;
        else break;
      }
      streakSum += streak;
    }

    const avgStreak = total ? Math.round((streakSum / total) * 10) / 10 : 0;
    const pct = total ? Math.round((doneToday / total) * 100) : 0;

    return { total, doneToday, pct, avgStreak };
  }, [state.habits, today]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Habits</h1>
          <p className="text-zinc-400 mt-1">Small actions. Low effort. High impact.</p>
        </div>

        <Button variant="secondary" disabled>
          <span className="inline-flex items-center gap-2">
            <Plus size={16} />
            Add habit (later)
          </span>
        </Button>
      </div>

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
              const habits = state.habits ?? [];
              const done = habits.filter((h) => h.completedDates.includes(day)).length;
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {state.habits.map((h) => {
          const doneToday = h.completedDates.includes(today);

          // streak (consecutive ending today)
          let streak = 0;
          for (let i = 0; i < 60; i++) {
            const d = ymd(addDays(new Date(), -i));
            if (h.completedDates.includes(d)) streak += 1;
            else break;
          }

          // last 7 day completion for this habit
          const weekDone = week.map((d) => h.completedDates.includes(ymd(d)));

          return (
            <Card
              key={h.id}
              title={h.name}
              subtitle={`Goal: ${h.goal}`}
              right={
                <button
                  onClick={() => toggleHabitDone(h.id, today)}
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
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-zinc-400">
                  Completed: <span className="text-zinc-200 font-semibold">{h.completedDates.length}</span> days
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
                        onClick={() => toggleHabitDone(h.id, day)}
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
