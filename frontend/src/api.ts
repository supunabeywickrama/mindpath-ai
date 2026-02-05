const API_BASE = "http://localhost:8000/api";

export async function getHealth() {
  const r = await fetch(`${API_BASE}/health`);
  return r.json();
}

export async function addMood(mood: number, note?: string) {
  const r = await fetch(`${API_BASE}/mood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood, note }),
  });
  return r.json();
}

export async function listMoods() {
  const r = await fetch(`${API_BASE}/mood`);
  return r.json();
}
