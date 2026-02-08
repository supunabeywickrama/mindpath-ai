import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Search, Trash2, BookText, Sparkles } from "lucide-react";
import { type AiMode } from "../mock/ai";
import { apiGetAuth } from "../lib/api";
import { useAuthContext } from "@asgardeo/auth-react";

import {
  listJournal,
  createJournal,
  deleteJournal,
  aiTransform,
  type JournalOut,
} from "../lib/api";

const EMOTIONS = ["sad", "anxious", "tired", "numb", "okay", "hopeful", "stressed"];

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function Journal() {
  const { getAccessToken } = useAuthContext();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const d = await apiGetAuth(`/api/insights/summary?days=7`, getAccessToken);
      setData(d);
    })();
  }, [getAccessToken]);

  // Editor state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<number | "">("");
  const [emotions, setEmotions] = useState<string[]>([]);

  // List + selection
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Data from backend
  const [itemsRaw, setItemsRaw] = useState<JournalOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");

  // AI panel state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>("summarize");
  const [aiOutput, setAiOutput] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const data = await listJournal();
      setItemsRaw(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load journal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const items = useMemo(() => {
    const all = [...itemsRaw].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (!q.trim()) return all;
    const s = q.toLowerCase();
    return all.filter(
      (j) =>
        j.title.toLowerCase().includes(s) ||
        j.content.toLowerCase().includes(s) ||
        (j.emotions ?? []).some((e) => e.toLowerCase().includes(s))
    );
  }, [itemsRaw, q]);

  const selected = useMemo(
    () => (selectedId ? items.find((x) => x.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  function toggleEmotion(e: string) {
    setEmotions((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function save() {
    if (!content.trim()) return;
    setErr("");
    setSaving(true);
    try {
      const created = await createJournal({
        title: title.trim() || "Untitled",
        content: content.trim(),
        mood: mood === "" ? null : mood,
        emotions,
      });

      setItemsRaw((prev) => [created, ...prev]);

      setTitle("");
      setContent("");
      setMood("");
      setEmotions([]);
      setSelectedId(null);

      setAiOpen(false);
      setAiOutput("");
      setAiLoading(false);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(entryId: number) {
    setErr("");
    try {
      await deleteJournal(entryId);
      setItemsRaw((prev) => prev.filter((x) => x.id !== entryId));
      if (selectedId === entryId) {
        setSelectedId(null);
        setAiOpen(false);
        setAiOutput("");
        setAiLoading(false);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete entry.");
    }
  }

  async function runAi(mode: AiMode) {
    if (!selected) return;
    setAiOpen(true);
    setAiMode(mode);
    setAiLoading(true);
    setAiOutput("");

    try {
      const res = await aiTransform(selected.content, mode);
      setAiOutput(res.output);
    } catch (e: any) {
      setAiOutput(`Error: ${e.message || "Failed to generate AI response."}`);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="text-zinc-400 mt-1">
            Write freely. Short notes are enough. Entries are now saved in your database.
          </p>
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
        {/* Left: create entry */}
        <div className="lg:col-span-5">
          <Card
            title="New entry"
            subtitle="A few lines can reduce mental load"
            right={
              <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
                <BookText size={14} />
                Synced (DB)
              </div>
            }
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Heavy morning"
                  className="mt-1 w-full rounded-xl bg-zinc-950/40 border border-white/10 px-3 py-2 outline-none focus:border-indigo-400/40"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500">Mood (optional)</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={mood === "" ? 5 : mood}
                    onChange={(e) => setMood(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-16 text-right text-lg font-semibold">
                    {mood === "" ? "—" : `${mood}/10`}
                  </div>
                  <button
                    onClick={() => setMood("")}
                    className="px-3 py-1.5 rounded-xl text-sm bg-white/5 border border-white/10 hover:bg-white/10"
                    title="Clear mood"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500">Emotions (optional)</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EMOTIONS.map((e) => {
                    const on = emotions.includes(e);
                    return (
                      <button
                        key={e}
                        onClick={() => toggleEmotion(e)}
                        className={`px-3 py-1.5 rounded-xl text-sm border transition ${on
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

              <div>
                <label className="text-xs text-zinc-500">Entry</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What’s on your mind? What felt hard? What helped, even a little?"
                  className="mt-1 w-full min-h-[220px] rounded-xl bg-zinc-950/40 border border-white/10 p-3 outline-none focus:border-indigo-400/40"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save entry"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTitle("");
                    setContent("");
                    setMood("");
                    setEmotions([]);
                  }}
                >
                  Clear
                </Button>
              </div>

              <div className="text-xs text-zinc-500">
                Tip: write 2–3 sentences only. Consistency beats perfection.
              </div>
            </div>
          </Card>
        </div>

        {/* Right: list + reader */}
        <div className="lg:col-span-7 space-y-4">
          <Card title="Entries" subtitle={loading ? "Loading..." : `${items.length} saved`}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title, content, emotions…"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-950/40 border border-white/10 outline-none focus:border-indigo-400/40"
                />
              </div>
              <Button variant="ghost" onClick={() => setQ("")}>
                Clear
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.slice(0, 8).map((j) => (
                <button
                  key={j.id}
                  onClick={() => {
                    setSelectedId(j.id);
                    setAiOpen(false);
                    setAiOutput("");
                    setAiLoading(false);
                  }}
                  className={`text-left rounded-2xl p-4 border transition ${selectedId === j.id
                    ? "bg-white/10 border-white/10"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold line-clamp-1">{j.title}</div>
                    {typeof j.mood === "number" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20">
                        {j.mood}/10
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{fmtTime(j.created_at)}</div>
                  <div className="text-sm text-zinc-300 mt-2 line-clamp-2">{j.content}</div>

                  {j.emotions?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {j.emotions.slice(0, 3).map((e) => (
                        <span
                          key={e}
                          className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300"
                        >
                          {e}
                        </span>
                      ))}
                      {j.emotions.length > 3 && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                          +{j.emotions.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {items.length > 8 && (
              <div className="text-xs text-zinc-500 mt-3">
                Showing 8 entries. (Pagination later)
              </div>
            )}
          </Card>

          {/* Reader */}
          <div className="rounded-2xl bg-zinc-900/50 border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-semibold">Reader</div>
                <div className="text-xs text-zinc-400">
                  Click an entry to view full content.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => selected && runAi("summarize")}
                  disabled={!selected}
                  className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  Summarize
                </button>

                <button
                  onClick={() => selected && runAi("rewrite")}
                  disabled={!selected}
                  className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  Rewrite
                </button>

                <button
                  onClick={() => selected && runAi("plan")}
                  disabled={!selected}
                  className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  Plan
                </button>

                {selected && (
                  <button
                    onClick={() => remove(selected.id)}
                    className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm flex items-center gap-2"
                    title="Delete entry"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="px-5 py-4">
              {!selected ? (
                <div className="text-sm text-zinc-400">Select an entry to read it here.</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xl font-semibold">{selected.title}</div>
                  <div className="text-xs text-zinc-500">{fmtTime(selected.created_at)}</div>

                  <div className="flex flex-wrap gap-2">
                    {typeof selected.mood === "number" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20">
                        Mood: {selected.mood}/10
                      </span>
                    )}
                    {selected.emotions?.map((e) => (
                      <span
                        key={e}
                        className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300"
                      >
                        {e}
                      </span>
                    ))}
                  </div>

                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-200">
                    {selected.content}
                  </div>

                  {aiOpen && (
                    <div className="mt-4 rounded-2xl bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-400/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            <Sparkles size={16} className="text-indigo-200" />
                            AI Output{" "}
                            <span className="text-xs text-zinc-400 capitalize">
                              ({aiMode})
                            </span>
                          </div>

                        </div>

                        <button
                          onClick={() => navigator.clipboard.writeText(aiOutput || "")}
                          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                        >
                          Copy
                        </button>
                      </div>

                      <div className="mt-3 text-sm whitespace-pre-wrap text-zinc-200">
                        {aiLoading ? "Thinking..." : aiOutput || "No output yet."}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setAiOpen(false)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                        >
                          Close
                        </button>

                        <button
                          onClick={() => {
                            if (aiOutput) setContent(aiOutput);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/20 hover:bg-indigo-500/25 text-sm"
                        >
                          Use as draft
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-zinc-500 pt-2 border-t border-white/10">
                    Next: real AI summaries + RAG coping plans (Premium).
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
