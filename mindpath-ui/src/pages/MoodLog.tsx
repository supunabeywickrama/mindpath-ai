import { useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAppStore } from "../store/useAppStore";

const EMOTIONS = ["sad", "anxious", "tired", "numb", "okay", "hopeful", "stressed"];
const TAGS = [
  { key: "sleep_poor", label: "Poor sleep" },
  { key: "stress_high", label: "High stress" },
  { key: "low_activity", label: "Low activity" },
  { key: "social", label: "Social time" },
  { key: "caffeine", label: "Caffeine" },
];

export default function MoodLog() {
  const { addMood } = useAppStore();
  const [mood, setMood] = useState(5);
  const [note, setNote] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [tags, setTags] = useState<Record<string, boolean>>({});

  function toggleEmotion(e: string) {
    setEmotions((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  function toggleTag(k: string) {
    setTags((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  function save() {
    addMood({
      date: new Date().toISOString(),
      mood,
      emotions,
      tags,
      note: note.trim() || undefined,
    });
    setNote("");
    setEmotions([]);
    setTags({});
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mood Log</h1>
          <p className="text-zinc-400 mt-1">Takes 60 seconds. Keep it simple.</p>
        </div>
        <Button onClick={save}>Save</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Mood level" subtitle="0 (low) → 10 (great)">
          <div className="flex items-center gap-4">
            <input
              className="w-full"
              type="range"
              min={0}
              max={10}
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
            />
            <div className="text-2xl font-semibold w-16 text-right">{mood}/10</div>
          </div>
        </Card>

        <Card title="Emotions" subtitle="Pick what fits (optional)">
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((e) => {
              const on = emotions.includes(e);
              return (
                <button
                  key={e}
                  onClick={() => toggleEmotion(e)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                    on ? "bg-indigo-500/20 border-indigo-400/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Tags" subtitle="Context that affects mood (optional)">
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = !!tags[t.key];
              return (
                <button
                  key={t.key}
                  onClick={() => toggleTag(t.key)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                    on ? "bg-indigo-500/20 border-indigo-400/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Note" subtitle="A short line is enough (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened today?"
            className="w-full min-h-[140px] rounded-xl bg-zinc-950/40 border border-white/10 p-3 outline-none focus:border-indigo-400/40"
          />
        </Card>
      </div>
    </div>
  );
}
