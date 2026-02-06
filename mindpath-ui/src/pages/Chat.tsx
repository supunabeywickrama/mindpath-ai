import { useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Mic, Send, Sparkles } from "lucide-react";
import { aiChat, type ChatMsg } from "../lib/api";

type Msg = { role: "user" | "assistant"; text: string; ts: string };

function now() {
  return new Date().toISOString();
}

function toApiHistory(msgs: Msg[]): ChatMsg[] {
  return msgs.map((m) => ({ role: m.role, content: m.text }));
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      ts: now(),
      text:
        "Hi — I’m here with you. If you want, tell me how today has been in one sentence.",
    },
  ]);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const listRef = useRef<HTMLDivElement>(null);

  const quick = useMemo(
    () => [
      "Guide me through a 60-second breathing exercise",
      "Give me one small action for today",
      "Help me write a short journal note",
    ],
    []
  );

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function send(content?: string) {
    const msg = (content ?? text).trim();
    if (!msg || loading) return;

    setErr("");

    const userMsg: Msg = { role: "user", text: msg, ts: now() };
    const nextMsgs = [...messages, userMsg];

    setMessages(nextMsgs);
    setText("");
    scrollToBottom();
    setLoading(true);

    try {
      const res = await aiChat(msg, toApiHistory(nextMsgs));
      const reply: Msg = {
        role: "assistant",
        ts: res.created_at ?? now(),
        text: res.reply,
      };
      setMessages((m) => [...m, reply]);
      scrollToBottom();
    } catch (e: any) {
      setErr(e?.message ?? "Chat failed.");
      const reply: Msg = {
        role: "assistant",
        ts: now(),
        text:
          "Sorry — I couldn’t reach the server. Please make sure the backend is running and you’re logged in.",
      };
      setMessages((m) => [...m, reply]);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Assistant panel */}
      <div className="lg:col-span-4">
        <Card
          title="AI Assistant"
          subtitle={loading ? "Thinking..." : "Supportive chat (backend mock now)"}
          right={<span className="text-xs text-zinc-500">RAG later</span>}
        >
          <div className="rounded-2xl bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-400/10 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center">
                <Sparkles className="text-indigo-200" size={18} />
              </div>
              <div>
                <div className="font-semibold">MindPath Companion</div>
                <div className="text-xs text-zinc-400">
                  Calm • Non-judgmental • Short steps
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-zinc-300 leading-relaxed">
              I can help with:
              <ul className="mt-2 space-y-1 text-zinc-400">
                <li>• Breathing & grounding</li>
                <li>• Small action plans</li>
                <li>• Journaling prompts</li>
              </ul>
            </div>

            <div className="mt-4 text-xs text-zinc-500">
              Note: Not a medical service. If you feel unsafe, seek immediate help.
            </div>

            {err && (
              <div className="mt-4 rounded-xl bg-red-500/10 border border-red-400/20 px-3 py-2 text-xs text-red-200">
                {err}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs text-zinc-500 mb-2">QUICK START</div>
            <div className="flex flex-col gap-2">
              {quick.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-left rounded-2xl px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-50"
                >
                  <div className="text-sm">{q}</div>
                  <div className="text-xs text-zinc-500 mt-1">Tap to send</div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Right: Chat */}
      <div className="lg:col-span-8">
        <div className="rounded-2xl bg-zinc-900/50 border border-white/10 overflow-hidden">
          {/* Chat header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="font-semibold">Conversation</div>
              <div className="text-xs text-zinc-400">Short, supportive replies.</div>
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                setMessages((prev) => (prev.length ? [prev[0]] : prev))
              }
            >
              Clear
            </Button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="h-[62vh] overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-4 py-3 border whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-indigo-500/15 border-indigo-400/20"
                      : "bg-white/5 border-white/10",
                  ].join(" ")}
                >
                  <div className="text-sm leading-relaxed">{m.text}</div>
                  <div className="text-[11px] text-zinc-500 mt-2">{m.ts.slice(11, 16)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center disabled:opacity-50"
                title="Voice (later)"
                disabled={loading}
              >
                <Mic size={18} className="text-zinc-300" />
              </button>

              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={loading ? "Thinking..." : "Type a message…"}
                className="flex-1 h-11 rounded-xl bg-zinc-950/40 border border-white/10 px-3 outline-none focus:border-indigo-400/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                disabled={loading}
              />

              <button
                onClick={() => send()}
                disabled={loading}
                className="h-11 px-4 rounded-xl bg-indigo-500/90 hover:bg-indigo-500 border border-indigo-400/30 font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={16} />
                Send
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {["Breathing", "Grounding", "One small plan"].map((x) => (
                <button
                  key={x}
                  onClick={() => setText(x)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl text-sm bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50"
                >
                  {x}
                </button>
              ))}
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              This is for wellness support and reflection. It’s not a substitute for professional care.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
