import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Mic, Send, Sparkles, ShieldAlert, Phone, MessageCircle, MicOff, Loader2 } from "lucide-react";
import { aiChat, getChatMessages, listChatThreads, transcribeAudio, type ChatMsg } from "../lib/api";
import { apiGetAuth } from "../lib/api";
import { useAuthContext } from "@asgardeo/auth-react";

type Msg = { role: "user" | "assistant"; text: string; ts: string };

function now() {
  return new Date().toISOString();
}

function toApiHistory(msgs: Msg[]): ChatMsg[] {
  return msgs.map((m) => ({ role: m.role, content: m.text }));
}

function getStoredThreadId() {
  const v = localStorage.getItem("mindpath_thread_id");
  return v ? Number(v) : null;
}
function setStoredThreadId(id: number) {
  localStorage.setItem("mindpath_thread_id", String(id));
}
function clearStoredThreadId() {
  localStorage.removeItem("mindpath_thread_id");
}

function isCrisisAssistantMessage(text: string) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("are you safe right now") ||
    t.includes("if you’re in immediate danger") ||
    t.includes("if you're in immediate danger") ||
    t.includes("call your local emergency") ||
    t.includes("nearest emergency department")
  );
}

export default function Chat() {
  const { getAccessToken } = useAuthContext();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const d = await apiGetAuth(`/api/insights/summary?days=7`, getAccessToken);
      setData(d);
    })();
  }, [getAccessToken]);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      ts: now(),
      text: "Hi — I’m here with you. If you want, tell me how today has been in one sentence.",
    },
  ]);

  const [threadId, setThreadId] = useState<number | null>(getStoredThreadId());
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [err, setErr] = useState("");

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const quick = useMemo(
    () => [
      "Guide me through a 60-second breathing exercise",
      "Give me one small action for today",
      "Help me write a short journal note",
    ],
    []
  );

  const crisisActive = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") return isCrisisAssistantMessage(m.text);
    }
    return false;
  }, [messages]);



  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function loadThreadMessages(tid: number) {
    const apiMsgs = await getChatMessages(tid);
    if (!apiMsgs.length) return;

    const mapped: Msg[] = apiMsgs.map((m) => ({
      role: m.role,
      text: m.content,
      ts: m.created_at,
    }));

    setMessages(mapped);
    scrollToBottom();
  }

  useEffect(() => {
    (async () => {
      setErr("");
      setBootLoading(true);
      try {
        let tid = getStoredThreadId();

        if (!tid) {
          const threads = await listChatThreads();
          tid = threads?.[0]?.id ?? null;
          if (tid) setStoredThreadId(tid);
        }

        if (tid) {
          setThreadId(tid);
          await loadThreadMessages(tid);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load chat from server.");
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  async function send(content?: string) {
    // If we have recorded audio, transcribe it first
    let msg = (content ?? text).trim();

    if (recordedAudio && !content) {
      setLoading(true);
      try {
        const { text: transcribed } = await transcribeAudio(recordedAudio);
        msg = transcribed;
        setRecordedAudio(null); // Clear audio after using it
      } catch (e: any) {
        setErr("Transcription failed: " + e.message);
        setLoading(false);
        return;
      }
    }

    if (!msg || loading) return;

    setErr("");

    const userMsg: Msg = { role: "user", text: msg, ts: now() };
    const nextMsgs = [...messages, userMsg];

    setMessages(nextMsgs);
    setText("");
    scrollToBottom();
    setLoading(true);

    try {
      const res = await aiChat(msg, toApiHistory(nextMsgs), threadId);

      if (!threadId || threadId !== res.thread_id) {
        setThreadId(res.thread_id);
        setStoredThreadId(res.thread_id);
      }

      await loadThreadMessages(res.thread_id);
    } catch (e: any) {
      setErr(e?.message ?? "Chat failed.");
      const reply: Msg = {
        role: "assistant",
        ts: now(),
        text: "Sorry — I couldn’t reach the server. Please check backend + worker are running.",
      };
      setMessages((m) => [...m, reply]);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  }

  async function refreshFromServer() {
    if (!threadId) return;
    setErr("");
    try {
      await loadThreadMessages(threadId);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to refresh.");
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        ts: now(),
        text: "Hi — I’m here with you. What’s going on today?",
      },
    ]);
    setThreadId(null);
    clearStoredThreadId();
  }

  // Voice Logic
  async function startRecording() {
    setErr("");
    setRecordedAudio(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop()); // Stop mic
        setRecordedAudio(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      setErr("Could not access microphone. Please allow permissions.");
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function discardRecording() {
    setRecordedAudio(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Assistant panel */}
      <div className="lg:col-span-4">
        <Card
          title="AI Assistant"
          subtitle={bootLoading ? "Loading from server..." : loading ? "Thinking..." : "Supportive chat"}
          right={<span className="text-xs text-zinc-500">RAG on</span>}
        >
          <div className="rounded-2xl bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-400/10 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center">
                <Sparkles className="text-indigo-200" size={18} />
              </div>
              <div>
                <div className="font-semibold">MindPath Companion</div>
                <div className="text-xs text-zinc-400">Calm • Non-judgmental • Short steps</div>
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

            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                onClick={refreshFromServer}
                disabled={!threadId || loading || bootLoading}
              >
                Refresh
              </Button>
              <Button variant="ghost" onClick={clearChat} disabled={loading || bootLoading}>
                New chat
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs text-zinc-500 mb-2">QUICK START</div>
            <div className="flex flex-col gap-2">
              {quick.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading || bootLoading}
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
              <div className="text-xs text-zinc-400">
                {threadId ? `Thread #${threadId}` : "New thread will be created on first message."}
              </div>
            </div>
            <Button variant="ghost" onClick={clearChat} disabled={loading || bootLoading}>
              Clear
            </Button>
          </div>

          {/* Crisis banner */}
          {crisisActive && (
            <div className="px-5 py-4 border-b border-white/10">
              <div className="rounded-2xl bg-red-500/10 border border-red-400/25 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-red-500/15 border border-red-400/20 flex items-center justify-center">
                    <ShieldAlert size={18} className="text-red-200" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-red-100">Safety support</div>
                    <div className="text-sm text-red-100/80 mt-1 leading-relaxed">
                      If you feel in immediate danger, call your local emergency number or go to the nearest emergency
                      department. If you can, contact someone you trust right now.
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href="tel:119"
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                        title="Call emergency (Sri Lanka default: 119)"
                      >
                        <Phone size={16} />
                        Call emergency (119)
                      </a>
                      <button
                        onClick={() => setText("I’m not feeling safe right now. Please help me ground for 60 seconds.")}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                      >
                        <MessageCircle size={16} />
                        Ask for grounding
                      </button>
                      <button
                        onClick={() => setText("I am safe right now.")}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                      >
                        I’m safe
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-red-100/60">
                      This app is not a substitute for professional care.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={listRef} className="h-[62vh] overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-4 py-3 border whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-indigo-500/15 border-indigo-400/20"
                      : isCrisisAssistantMessage(m.text)
                        ? "bg-red-500/10 border-red-400/25"
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
                className={`h-11 w-11 rounded-xl border flex items-center justify-center transition disabled:opacity-50 ${isRecording ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse" : recordedAudio ? "bg-white/5 border-white/10 text-indigo-400" : "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300"}`}
                title={isRecording ? "Stop recording" : "Voice input"}
                onClick={toggleRecording}
                disabled={loading || bootLoading}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <div className="flex-1 relative">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={isRecording ? "Listening..." : recordedAudio ? "Voice message recorded. Click Send." : loading ? "Thinking..." : "Type a message…"}
                  className="w-full h-11 rounded-xl bg-zinc-950/40 border border-white/10 px-3 outline-none focus:border-indigo-400/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  disabled={loading || bootLoading || isRecording}
                />
                {recordedAudio && (
                  <button
                    onClick={discardRecording}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition"
                    title="Discard recording"
                  >
                    <MicOff size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={() => send()}
                disabled={loading || bootLoading || isRecording || (!text && !recordedAudio)}
                className="h-11 px-4 rounded-xl bg-indigo-500/90 hover:bg-indigo-500 border border-indigo-400/30 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {["Breathing", "Grounding", "One small plan"].map((x) => (
                <button
                  key={x}
                  onClick={() => setText(x)}
                  disabled={loading || bootLoading}
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
