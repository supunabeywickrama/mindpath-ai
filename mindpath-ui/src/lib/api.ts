const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

/**
 * DEV auth support (current)
 * - Keeps your existing dev login flow working (X-User-Id)
 */
export function getUserId() {
  return localStorage.getItem("mindpath_user_id");
}

export function setUserId(id: number) {
  localStorage.setItem("mindpath_user_id", String(id));
}

export function clearUserId() {
  localStorage.removeItem("mindpath_user_id");
}

/**
 * OIDC auth support (Asgardeo)
 * - Store access token if you want a non-hook API layer
 * - OPTIONAL: You can skip this and pass token per request from pages using useAuthContext().
 */
export function setAccessToken(token: string) {
  localStorage.setItem("mindpath_access_token", token);
}

export function getAccessTokenStored() {
  return localStorage.getItem("mindpath_access_token");
}

export function clearAccessToken() {
  localStorage.removeItem("mindpath_access_token");
}

async function parseError(res: Response) {
  const text = await res.text();
  return text || `Request failed: ${res.status}`;
}

/**
 * Core request helper:
 * - If token is provided -> Authorization: Bearer <token>
 * - Else if dev user id exists -> X-User-Id
 * - Content-Type is set only when needed (JSON body)
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const userId = getUserId();
  const storedToken = getAccessTokenStored();
  const authToken = token || storedToken;

  const headers = new Headers(options.headers || {});

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  if (userId) {
    headers.set("X-User-Id", userId);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

/**
 * Convenience:
 * - Use Asgardeo token provider from pages (recommended)
 *   const { getAccessToken } = useAuthContext();
 *   apiGetAuth("/api/...", getAccessToken)
 */
export async function apiGetAuth<T>(path: string, getToken: () => Promise<string>) {
  const token = await getToken();
  return request<T>(path, { method: "GET" }, token);
}

export async function apiPostAuth<T>(
  path: string,
  body: unknown,
  getToken: () => Promise<string>
) {
  const token = await getToken();
  return request<T>(
    path,
    { method: "POST", body: JSON.stringify(body) },
    token
  );
}

export async function apiDeleteAuth<T>(path: string, getToken: () => Promise<string>) {
  const token = await getToken();
  return request<T>(path, { method: "DELETE" }, token);
}

/**
 * If you choose to store token in localStorage (optional),
 * these helpers use stored Bearer token automatically.
 */
export async function apiGet<T>(path: string) {
  const token = getAccessTokenStored() ?? undefined;
  return request<T>(path, { method: "GET" }, token);
}

export async function apiPost<T>(path: string, body: unknown) {
  const token = getAccessTokenStored() ?? undefined;
  return request<T>(path, { method: "POST", body: JSON.stringify(body) }, token);
}

export async function apiDelete<T>(path: string) {
  const token = getAccessTokenStored() ?? undefined;
  return request<T>(path, { method: "DELETE" }, token);
}

/* -------- AUTH (DEV) -------- */
export async function devLogin(email: string) {
  return request<{ id: number; email: string }>(`/api/auth/dev-login`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/* -------- AUTH (LOCAL) -------- */
export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type UserProfile = {
  id: number;
  email: string;
  created_at: string;
  is_admin: boolean;
  full_name?: string | null;
  language?: string;
  country?: string | null;
  timezone?: string;
  subscription_plan?: string; // free, trial, premium
  is_trial?: boolean;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
};

export async function register(email: string, password: string) {
  return request<TokenResponse>(`/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string) {
  return request<TokenResponse>(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  const token = getAccessTokenStored() ?? undefined;
  return request<UserProfile>(`/api/auth/me`, { method: "GET" }, token);
}

export async function updateMe(payload: Partial<UserProfile>) {
  const token = getAccessTokenStored() ?? undefined;
  return request<UserProfile>(`/api/auth/me`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, token);
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
  return request<JournalOut[]>(`/api/journal`, { method: "GET" });
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
  return request<{ deleted: boolean }>(`/api/journal/${entryId}`, { method: "DELETE" });
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
  return request<MoodOut[]>(`/api/moods`, { method: "GET" });
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

/* -------- AI CHAT -------- */
export type ChatMsg = { role: "user" | "assistant"; content: string };

export async function aiTransform(text: string, mode: "summarize" | "rewrite" | "plan") {
  return request<{ output: string }>(`/api/ai/transform`, {
    method: "POST",
    body: JSON.stringify({ text, mode }),
  });
}

export async function aiChat(
  message: string,
  history: ChatMsg[],
  threadId?: number | null
) {
  return request<{ reply: string; created_at: string; thread_id: number }>(`/api/ai/chat`, {
    method: "POST",
    body: JSON.stringify({ message, history, thread_id: threadId ?? null }),
  });
}

export async function transcribeAudio(audioBlob: Blob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");

  // We use fetch directly here because 'request' helper assumes JSON usually, 
  // and we need to let browser set Content-Type for FormData
  const token = getAccessTokenStored();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/ai/transcribe`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await res.text() || "Transcription failed");
  }

  return res.json() as Promise<{ text: string }>;
}

export async function listChatThreads() {
  return request<{ id: number; title: string; created_at: string }[]>(`/api/ai/threads`, {
    method: "GET",
  });
}

export async function getChatMessages(threadId: number) {
  return request<{ id: number; role: "user" | "assistant"; content: string; created_at: string }[]>(
    `/api/ai/threads/${threadId}/messages`,
    { method: "GET" }
  );
}

/* -------- NOTIFICATIONS / CHECK-IN -------- */
export type CheckInSchedule = {
  id: number;
  tz: string;
  hour: number;
  minute: number;
  enabled: boolean;
};

export async function getCheckIn() {
  return request<CheckInSchedule | null>(`/api/notifications/checkin`, { method: "GET" });
}

export async function setCheckIn(payload: {
  tz: string;
  hour: number;
  minute: number;
  enabled: boolean;
}) {
  return request<CheckInSchedule>(`/api/notifications/checkin`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* -------- REMINDERS -------- */
export interface Reminder {
  id: number;
  user_id: number;
  created_at: string;
  title: string;
  next_trigger: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  email_enabled: boolean;
}

export async function listReminders() {
  return request<Reminder[]>("/api/reminders", { method: "GET" });
}

export async function createReminder(data: {
  title: string;
  next_trigger: string; // ISO string
  is_recurring: boolean;
  recurrence_pattern?: string;
  email_enabled: boolean;
}) {
  return request<Reminder>("/api/reminders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteReminder(id: number) {
  return request<{ deleted: boolean }>(`/api/reminders/${id}`, {
    method: "DELETE",
  });
}

/* -------- HABITS -------- */
export interface Habit {
  id: number;
  name: string;
  goal: string;
  active: boolean;
  created_at: string;
  completed_dates: string[]; // YYYY-MM-DD
}

export async function listHabits() {
  return request<Habit[]>("/api/habits", { method: "GET" });
}

export async function createHabit(data: { name: string; goal: string }) {
  return request<Habit>("/api/habits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteHabit(id: number) {
  return request<{ ok: boolean }>(`/api/habits/${id}`, { method: "DELETE" });
}

export async function toggleHabit(id: number, date: string) {
  return request<{ habit_id: number; date: string; done: boolean }>(
    `/api/habits/${id}/toggle`,
    {
      method: "POST",
    }
  );
}

/* -------- BILLING -------- */
export async function startTrial() {
  return request<UserProfile>("/api/billing/start-trial", { method: "POST" });
}

export async function upgradePremium() {
  return request<UserProfile>("/api/billing/upgrade", { method: "POST" });
}

export async function cancelSubscription() {
  return request<UserProfile>("/api/billing/cancel", { method: "POST" });
}

export async function createCheckoutSession(period: "monthly" | "yearly") {
  return request<{ url: string }>("/api/payment/checkout", {
    method: "POST",
    body: JSON.stringify({ period }),
  });
}

export async function signPayHere(period: "monthly" | "yearly") {
  return request<any>("/api/payhere/sign", {
    method: "POST",
    body: JSON.stringify({ period }),
  });
}
