const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export function getUserId() {
  return localStorage.getItem("mindpath_user_id");
}

export function setUserId(id: number) {
  localStorage.setItem("mindpath_user_id", String(id));
}

export function clearUserId() {
  localStorage.removeItem("mindpath_user_id");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const userId = getUserId();

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (userId) headers.set("X-User-Id", userId);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* -------- AUTH -------- */
export async function devLogin(email: string) {
  return request<{ id: number; email: string }>(`/api/auth/dev-login`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/* -------- JOURNAL -------- */
export type JournalOut = {
  id: number;
  user_id: number;
  created_at: string;
  title: string;
  content: string;
  mood: number | null;
  emotions: string[];
};

export async function listJournal() {
  return request<JournalOut[]>(`/api/journal`);
}

export async function createJournal(payload: {
  title: string;
  content: string;
  mood?: number | null;
  emotions?: string[];
}) {
  return request<JournalOut>(`/api/journal`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteJournal(entryId: number) {
  return request<{ deleted: boolean }>(`/api/journal/${entryId}`, {
    method: "DELETE",
  });
}

/* -------- MOODS -------- */
export type MoodOut = {
  id: number;
  user_id: number;
  created_at: string;
  mood: number;
  emotions: string[];
  tags: Record<string, any>;
  note: string | null;
};

export async function listMoods() {
  return request<MoodOut[]>(`/api/moods`);
}

export async function createMood(payload: {
  mood: number;
  emotions?: string[];
  tags?: Record<string, any>;
  note?: string | null;
}) {
  return request<MoodOut>(`/api/moods`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ChatMsg = { role: "user" | "assistant"; content: string };

export async function aiChat(message: string, history: ChatMsg[], threadId?: number | null) {
  return request<{ reply: string; created_at: string; thread_id: number }>(`/api/ai/chat`, {
    method: "POST",
    body: JSON.stringify({ message, history, thread_id: threadId ?? null }),
  });
}

export async function listChatThreads() {
  return request<{ id: number; title: string; created_at: string }[]>(`/api/ai/threads`);
}

export async function getChatMessages(threadId: number) {
  return request<{ id: number; role: "user" | "assistant"; content: string; created_at: string }[]>(
    `/api/ai/threads/${threadId}/messages`
  );
}


