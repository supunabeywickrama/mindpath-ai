import { useEffect, useMemo, useState } from "react";
import type { AppState, MoodEntry, Habit, Plan, UserSettings } from "../types/models";
import { seedState } from "../mock/seed";

const KEY = "mindpath_state_v1";

function load(): AppState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return seedState();
  try { return JSON.parse(raw) as AppState; } catch { return seedState(); }
}
function save(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => load());

  useEffect(() => { save(state); }, [state]);

  const api = useMemo(() => ({
    state,

    addMood(entry: Omit<MoodEntry, "id">) {
      const withId: MoodEntry = { ...entry, id: crypto.randomUUID() };
      setState(s => ({ ...s, mood: [...s.mood, withId] }));
    },

    toggleHabitDone(habitId: string, ymd: string) {
      setState(s => ({
        ...s,
        habits: s.habits.map(h => {
          if (h.id !== habitId) return h;
          const exists = h.completedDates.includes(ymd);
          return { ...h, completedDates: exists ? h.completedDates.filter(d => d !== ymd) : [...h.completedDates, ymd] };
        })
      }));
    },

    setPlan(plan: Plan) {
      setState(s => ({ ...s, plan }));
    },

    updateSettings(patch: Partial<UserSettings>) {
      setState(s => ({ ...s, settings: { ...s.settings, ...patch } }));
    },

    reset() {
      setState(seedState());
    }
  }), [state]);

  return api;
}
