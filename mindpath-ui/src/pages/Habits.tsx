import Card from "../components/Card";
import Button from "../components/Button";
import { useAppStore } from "../store/useAppStore";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Habits() {
  const { state, toggleHabitDone } = useAppStore();
  const today = ymd(new Date());

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Habits</h1>
          <p className="text-zinc-400 mt-1">Small actions. Low effort. High impact.</p>
        </div>
        <Button variant="secondary" disabled>
          + Add habit (later)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {state.habits.map((h) => {
          const done = h.completedDates.includes(today);
          return (
            <Card
              key={h.id}
              title={h.name}
              subtitle={`Goal: ${h.goal}`}
              right={
                <button
                  onClick={() => toggleHabitDone(h.id, today)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                    done ? "bg-emerald-500/15 border-emerald-400/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {done ? "Done today ✓" : "Mark done"}
                </button>
              }
            >
              <div className="text-sm text-zinc-400">
                Completed days: <span className="text-zinc-200">{h.completedDates.length}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[...Array(7)].map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-10 rounded-full border ${
                      i < Math.min(h.completedDates.length, 7)
                        ? "bg-emerald-500/30 border-emerald-400/20"
                        : "bg-white/5 border-white/10"
                    }`}
                    title="Weekly progress (mock)"
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
