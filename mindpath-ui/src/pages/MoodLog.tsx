import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { listMoods, createMood, type MoodOut } from "../lib/api";

const EMOTIONS = ["sad", "anxious", "tired", "numb", "okay", "hopeful", "stressed"];

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function Mood() {
  const [mood, setMood] = useState(5);
  const [note, setNote] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [stressHigh, setStressHigh] = useState(false);
  const [sleepPoor, setSleepPoor] = useState(false);

  const [itemsRaw, setItemsRaw] = useState<MoodOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const data = await listMoods();
      setItemsRaw(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load moods.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function toggleEmotion(e: string) {
    setEmotions((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function save() {
    setErr("");
    setSaving(true);
    try {
      const created = await createMood({
        mood,
        emotions,
        tags: { stress_high: stressHigh, sleep_poor: sleepPoor },
        note: note.trim() ? note.trim() : null,
      });

      setItemsRaw((prev) => [created, ...prev]);

      setNote("");
      setEmotions([]);
      setStressHigh(false);
      setSleepPoor(false);
      setMood(5);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save mood.");
    } finally {
      setSaving(false);
    }
  }

  const items = useMemo(() => {
    return [...itemsRaw].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [itemsRaw]);

  const avg7 = useMemo(() => {
    const last7 = items.slice(0, 7);
    if (!last7.length) return null;
    const sum = last7.reduce((acc, x) => acc + x.mood, 0);
    return Math.round((sum / last7.length) * 10) / 10;
  }, [items]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mood Log</h1>
          <p className="text-zinc-400 mt-1">Track your mood. Saved to your database.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {err && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: form */}
        <div className="lg:col-span-5">
          <Card title="Today" subtitle="Quick check-in">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500">Mood (0–10)</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={mood}
                    onChange={(e) => setMood(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-16 text-right text-lg font-semibold">{mood}/10</div>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500">Emotions</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EMOTIONS.map((e) => {
                    const on = emotions.includes(e);
                    return (
                      <button
                        key={e}
                        onClick={() => toggleEmotion(e)}
                        className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                          on
                            ? "bg-indigo-500/20 border-indigo-400/30"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={stressHigh}
                    onChange={(e) => setStressHigh(e.target.checked)}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  Stress high
                </label>

                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={sleepPoor}
                    onChange={(e) => setSleepPoor(e.target.checked)}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  Sleep poor
                </label>
              </div>

              <div>
                <label className="text-xs text-zinc-500">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything important today?"
                  className="mt-1 w-full min-h-[120px] rounded-xl bg-zinc-950/40 border border-white/10 p-3 outline-none focus:border-indigo-400/40"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save mood"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMood(5);
                    setEmotions([]);
                    setStressHigh(false);
                    setSleepPoor(false);
                    setNote("");
                  }}
                >
                  Clear
                </Button>
              </div>

              {avg7 !== null && (
                <div className="text-xs text-zinc-500">
                  7-entry average: <span className="text-zinc-300">{avg7}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: history */}
        <div className="lg:col-span-7">
          <Card title="History" subtitle={loading ? "Loading..." : `${items.length} entries`}>
            <div className="space-y-3">
              {items.length === 0 && !loading && (
                <div className="text-sm text-zinc-400">No mood entries yet.</div>
              )}

              {items.slice(0, 12).map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Mood: {m.mood}/10</div>
                      <div className="text-xs text-zinc-500 mt-1">{fmtTime(m.created_at)}</div>
                    </div>

                    <div className="text-xs px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20">
                      {m.mood >= 7 ? "Good" : m.mood >= 4 ? "Okay" : "Low"}
                    </div>
                  </div>

                  {m.emotions?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.emotions.map((e) => (
                        <span
                          key={e}
                          className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2 text-xs text-zinc-400">
                    {m.tags?.stress_high && (
                      <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                        stress_high
                      </span>
                    )}
                    {m.tags?.sleep_poor && (
                      <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                        sleep_poor
                      </span>
                    )}
                  </div>

                  {m.note && (
                    <div className="mt-3 text-sm text-zinc-200 whitespace-pre-wrap">
                      {m.note}
                    </div>
                  )}
                </div>
              ))}

              {items.length > 12 && (
                <div className="text-xs text-zinc-500">Showing 12 entries. (Pagination later)</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
