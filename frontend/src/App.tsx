import { useEffect, useState } from "react";
import { getHealth, addMood, listMoods } from "./api";

export default function App() {
  const [health, setHealth] = useState<any>(null);
  const [mood, setMood] = useState(5);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    getHealth().then(setHealth);
    listMoods().then((d) => setItems(d.items || []));
  }, []);

  async function save() {
    await addMood(mood, note || undefined);
    const d = await listMoods();
    setItems(d.items || []);
    setNote("");
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>MindPath (Starter)</h1>
      <p>Backend health: {health?.status ?? "..."}</p>

      <h2>Log Mood</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="range"
          min={0}
          max={10}
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
        />
        <strong>{mood}/10</strong>
      </div>

      <textarea
        placeholder="Optional note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: "100%", height: 80, marginTop: 10 }}
      />
      <button onClick={save} style={{ marginTop: 10 }}>Save</button>

      <h2 style={{ marginTop: 30 }}>History</h2>
      <ul>
        {items.slice().reverse().map((x, i) => (
          <li key={i}>
            {x.created_at?.slice(0, 19)} — mood {x.mood}/10 {x.note ? `— ${x.note}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
