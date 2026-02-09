import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import {
  listReminders,
  createReminder,
  deleteReminder,
  type Reminder
} from "../lib/api";

import { Trash2, Calendar, Repeat } from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

// Helpers for Theme
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
}

function rgbToHex(rgbStr: string) {
  // expects "R G B"
  if (!rgbStr) return "#000000";
  const [r, g, b] = rgbStr.split(" ").map(Number);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export default function Settings() {

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [dateValue, setDateValue] = useState(""); // for datetime-local
  const [timeValue, setTimeValue] = useState("09:00"); // for time

  // Theme State
  const [primaryColor, setPrimaryColor] = useState("#6366f1"); // default indigo-500
  const [baseColor, setBaseColor] = useState("#09090b");    // default zinc-950

  useEffect(() => {
    loadReminders();
    loadTheme();
  }, []);

  function loadTheme() {
    // Try to get from computed style or local storage
    const style = getComputedStyle(document.documentElement);
    const p = style.getPropertyValue("--primary").trim();
    const b = style.getPropertyValue("--bg").trim();

    if (p) setPrimaryColor(rgbToHex(p));
    if (b) setBaseColor(rgbToHex(b));
  }

  function handleThemeChange(type: "primary" | "base", hex: string) {
    if (type === "primary") setPrimaryColor(hex);
    else setBaseColor(hex);

    const rgb = hexToRgb(hex);
    if (!rgb) return;

    if (type === "primary") {
      document.documentElement.style.setProperty("--primary", rgb);
    } else {
      document.documentElement.style.setProperty("--bg", rgb);
      // For now, let's make panels follow the base but maybe slightly lighter?
      // Or just keep them same as base for a "flat" look if that's what "2 tones" implies?
      // Let's set panel to the same for now, or maybe we don't touch panels 
      // and let them be distinct. 
      // If user wants "2 tones" (Primary + Base), maybe Base should cover panels too?
      // Let's set panel to base for now to be safe with "2 tones".
      document.documentElement.style.setProperty("--panel", rgb);
      document.documentElement.style.setProperty("--panel2", rgb);
    }

    // Save to local storage
    const current = localStorage.getItem("mindpath_custom_theme");
    let stored = current ? JSON.parse(current) : {};
    stored = { ...stored, [type]: rgb };
    if (type === "base") {
      stored.panel = rgb; // save panel as well
    }
    localStorage.setItem("mindpath_custom_theme", JSON.stringify(stored));
  }

  function resetTheme() {
    localStorage.removeItem("mindpath_custom_theme");
    window.location.reload();
  }

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

        <div className="lg:col-span-5 space-y-4">
          <Card title="Appearance" subtitle="Customize two-tone theme">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Primary Tone</label>
                <div className="text-xs text-zinc-500 mb-2">Buttons, accents, and highlights.</div>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleThemeChange("primary", e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-white/10 p-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 block mb-2">Base Tone</label>
                <div className="text-xs text-zinc-500 mb-2">Backgrounds and panels.</div>
                <input
                  type="color"
                  value={baseColor}
                  onChange={(e) => handleThemeChange("base", e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer bg-transparent border border-white/10 p-1"
                />
              </div>

              <div className="pt-2">
                <Button onClick={resetTheme} variant="secondary">
                  Reset to Default
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
