import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import {
  listReminders,
  createReminder,
  deleteReminder,
  type Reminder
} from "../lib/api";

import { Bell, Trash2, Plus, Calendar, Repeat } from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Settings() {

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [dateValue, setDateValue] = useState(""); // for datetime-local
  const [timeValue, setTimeValue] = useState("09:00"); // for time

  useEffect(() => {
    loadReminders();
    // (Optional) load other data
  }, []);

  async function loadReminders() {
    setLoading(true);
    try {
      const list = await listReminders();
      setReminders(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function addReminder() {
    if (!title) return;

    let nextTrigger: string;
    if (isRecurring) {
      // Create a date for the next occurrence of this time
      const d = new Date();
      const [h, m] = timeValue.split(":").map(Number);
      d.setHours(h, m, 0, 0);
      if (d < new Date()) {
        d.setDate(d.getDate() + 1);
      }
      nextTrigger = d.toISOString();
    } else {
      if (!dateValue) return;
      nextTrigger = new Date(dateValue).toISOString();
    }

    try {
      await createReminder({
        title,
        next_trigger: nextTrigger,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? "daily" : undefined,
        email_enabled: true
      });
      setTitle("");
      setDateValue("");
      loadReminders();
    } catch (e) {
      alert("Failed to add reminder");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this reminder?")) return;
    try {
      await deleteReminder(id);
      loadReminders();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-zinc-400 mt-1">Preferences & check-ins.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <Card title="Reminders" subtitle="Email notifications">
            <div className="space-y-4">
              {/* List */}
              <div className="space-y-2">
                {reminders.length === 0 && !loading && (
                  <div className="text-sm text-zinc-500 italic">No active reminders.</div>
                )}
                {reminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${r.is_recurring ? "bg-indigo-500/20 text-indigo-300" : "bg-zinc-800 text-zinc-400"}`}>
                        {r.is_recurring ? <Repeat size={18} /> : <Calendar size={18} />}
                      </div>
                      <div>
                        <div className="font-semibold">{r.title}</div>
                        <div className="text-xs text-zinc-400">
                          {r.is_recurring ? `Variable • Next: ${fmtDate(r.next_trigger)}` : fmtDate(r.next_trigger)}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => remove(r.id)} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-red-400 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New */}
              <div className="pt-4 border-t border-white/10">
                <div className="text-sm font-medium mb-3">Add Reminder</div>
                <div className="space-y-3">
                  <input
                    placeholder="Title (e.g. Meditation)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 rounded-xl bg-zinc-950/40 border border-white/10 px-3 outline-none"
                  />

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="accent-indigo-500"
                      />
                      Repeat Daily
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {isRecurring ? (
                      <input
                        type="time"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        className="h-10 rounded-xl bg-zinc-950/40 border border-white/10 px-3 outline-none"
                      />
                    ) : (
                      <input
                        type="datetime-local"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        className="h-10 rounded-xl bg-zinc-950/40 border border-white/10 px-3 outline-none"
                      />
                    )}
                    <button
                      onClick={addReminder}
                      disabled={!title}
                      className="h-10 rounded-xl bg-white text-zinc-950 font-medium hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card title="Next" subtitle="After schedule works">
            <div className="text-sm text-zinc-300 space-y-2">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                Worker service: sends check-ins + emails
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                RAG: grounded advice using guidelines + user history
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                Asgardeo auth: replace dev header with JWT
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
