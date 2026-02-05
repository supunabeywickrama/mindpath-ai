import Card from "../components/Card";
import Button from "../components/Button";
import { useAppStore } from "../store/useAppStore";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function Settings() {
  const { state, updateSettings, reset } = useAppStore();

  function setTheme(theme: "dark" | "warm") {
    updateSettings({ theme });
    // UI-only: you can later apply a real theme system.
    document.documentElement.dataset.theme = theme;
  }

  function toggleEmailWeeklySummary() {
    updateSettings({ emailWeeklySummary: !state.settings.emailWeeklySummary });
  }

  function addCheckin() {
    updateSettings({
      checkinTimes: [...state.settings.checkinTimes, { hour: 9, minute: 0 }],
    });
  }

  function updateCheckin(i: number, hour: number, minute: number) {
    const next = state.settings.checkinTimes.map((t, idx) =>
      idx === i ? { hour, minute } : t
    );
    updateSettings({ checkinTimes: next });
  }

  function removeCheckin(i: number) {
    const next = state.settings.checkinTimes.filter((_, idx) => idx !== i);
    updateSettings({ checkinTimes: next });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-zinc-400 mt-1">Preferences and notification options.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Appearance" subtitle="Choose a calm theme">
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("dark")}
              className={[
                "flex-1 rounded-2xl p-4 border text-left transition",
                state.settings.theme === "dark"
                  ? "bg-white/10 border-white/10"
                  : "bg-white/5 border-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              <div className="font-semibold">Dark</div>
              <div className="text-sm text-zinc-400 mt-1">Low-stimulus default.</div>
            </button>

            <button
              onClick={() => setTheme("warm")}
              className={[
                "flex-1 rounded-2xl p-4 border text-left transition",
                state.settings.theme === "warm"
                  ? "bg-white/10 border-white/10"
                  : "bg-white/5 border-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              <div className="font-semibold">Warm</div>
              <div className="text-sm text-zinc-400 mt-1">Softer tones (later).</div>
            </button>
          </div>

          <div className="text-xs text-zinc-500 mt-3">
            Full theme tokens will be added later. This is UI-first.
          </div>
        </Card>

        <Card title="Email notifications" subtitle="Opt-in messages only">
          <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4">
            <div>
              <div className="font-semibold">Weekly summary</div>
              <div className="text-sm text-zinc-400 mt-1">
                Get a weekly progress email (later with SendGrid).
              </div>
            </div>
            <button
              onClick={toggleEmailWeeklySummary}
              className={[
                "w-12 h-7 rounded-full border transition relative",
                state.settings.emailWeeklySummary
                  ? "bg-emerald-500/30 border-emerald-400/20"
                  : "bg-white/5 border-white/10",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-6 w-6 rounded-full bg-zinc-100/80 transition",
                  state.settings.emailWeeklySummary ? "left-6" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>

          <div className="text-xs text-zinc-500 mt-3">
            Email is never used for emergencies. Crisis help will always be in-app.
          </div>
        </Card>

        <Card title="Check-in times" subtitle="When you want reminders (UI-only)">
          <div className="space-y-3">
            {state.settings.checkinTimes.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 p-3"
              >
                <div className="text-sm font-medium">
                  Check-in {i + 1}
                  <span className="text-zinc-400 font-normal ml-2">
                    {pad2(t.hour)}:{pad2(t.minute)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={t.hour}
                    onChange={(e) => updateCheckin(i, Number(e.target.value), t.minute)}
                    className="w-16 rounded-xl bg-zinc-950/40 border border-white/10 px-2 py-1 outline-none"
                    title="Hour"
                  />
                  <span className="text-zinc-500">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={t.minute}
                    onChange={(e) => updateCheckin(i, t.hour, Number(e.target.value))}
                    className="w-16 rounded-xl bg-zinc-950/40 border border-white/10 px-2 py-1 outline-none"
                    title="Minute"
                  />
                  <button
                    onClick={() => removeCheckin(i)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={addCheckin}>
              + Add time
            </Button>
            <Button variant="ghost" onClick={reset}>
              Reset demo data
            </Button>
          </div>

          <div className="text-xs text-zinc-500 mt-3">
            Later: backend schedules real check-ins + emails.
          </div>
        </Card>

        <Card title="Privacy & safety" subtitle="Clear boundaries">
          <div className="space-y-2 text-sm text-zinc-300">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              This platform supports self-tracking and gentle guidance. It does not diagnose or
              replace professional care.
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              If you feel unsafe or have thoughts of self-harm, use local emergency services or
              talk to someone you trust immediately.
            </div>
          </div>

          <div className="mt-4">
            <Button variant="secondary" disabled>
              Crisis resources (later)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
