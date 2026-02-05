export type MoodEntry = {
  id: string;
  date: string;          // ISO string
  mood: number;          // 0-10
  emotions: string[];
  tags: Record<string, boolean>;
  note?: string;
};

export type Habit = {
  id: string;
  name: string;
  goal: string;          // e.g. "10 minutes"
  completedDates: string[]; // ISO dates "YYYY-MM-DD"
};

export type Plan = "free" | "trial" | "premium";

export type UserSettings = {
  theme: "dark" | "warm";
  checkinTimes: { hour: number; minute: number }[];
  emailWeeklySummary: boolean;
};

export type AppState = {
  mood: MoodEntry[];
  habits: Habit[];
  journal: JournalEntry[];
  plan: Plan;
  settings: UserSettings;
};

export type JournalEntry = {
  id: string;
  createdAt: string; // ISO
  title: string;
  content: string;
  mood?: number;      // 0-10 optional
  emotions: string[]; // optional tags
};

