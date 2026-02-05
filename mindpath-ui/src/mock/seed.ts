import type { AppState } from "../types/models";

export function seedState(): AppState {
  const today = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  const mood = Array.from({ length: 10 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return {
      id: crypto.randomUUID(),
      date: d.toISOString(),
      mood: Math.max(1, 7 - i % 5),
      emotions: i % 2 === 0 ? ["tired"] : ["okay"],
      tags: { sleep_poor: i % 3 === 0, stress_high: i % 4 === 0 },
      note: i % 3 === 0 ? "Long day." : ""
    };
  });

  return {
    mood,
    habits: [
      { id: crypto.randomUUID(), name: "10-min walk", goal: "10 minutes", completedDates: [ymd(today)] },
      { id: crypto.randomUUID(), name: "Morning sunlight", goal: "5 minutes", completedDates: [] },
      { id: crypto.randomUUID(), name: "Drink water", goal: "6 glasses", completedDates: [] }
    ],
    plan: "free",
    settings: {
      theme: "dark",
      checkinTimes: [{ hour: 9, minute: 0 }, { hour: 19, minute: 0 }],
      emailWeeklySummary: true
    }
  };
}
