import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { getCheckIn, setCheckIn, type CheckInSchedule } from "../lib/api";
import { apiGetAuth } from "../lib/api";
import { useAuthContext } from "@asgardeo/auth-react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function Settings() {
  const { getAccessToken } = useAuthContext();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const d = await apiGetAuth(`/api/insights/summary?days=7`, getAccessToken);
      setData(d);
    })();
  }, [getAccessToken]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [enabled, setEnabled] = useState(true);
  const [tz, setTz] = useState("Asia/Colombo");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    (async () => {
      setErr("");
      setOk("");
      setLoading(true);
      try {
        const s = await getCheckIn();
        if (s) {
          setEnabled(s.enabled);
          setTz(s.tz);
          setHour(s.hour);
          setMinute(s.minute);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const res = await setCheckIn({ enabled, tz, hour, minute });
      setEnabled(res.enabled);
      setTz(res.tz);
      setHour(res.hour);
      setMinute(res.minute);
      setOk("Saved.");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-zinc-400 mt-1">Preferences & check-ins.</p>
      </div>

      {err && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}
      {ok && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/20 px-4 py-3 text-sm text-emerald-200">
          {ok}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <Card title="Daily check-in" subtitle={loading ? "Loading..." : "Email + assistant message"}>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4">
                <div>
                  <div className="font-semibold">Enable daily check-in</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Sends a short “Hi, how are you?” at your chosen time.
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-5 w-5 accent-indigo-500"
                  />
                  {enabled ? "On" : "Off"}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-xs text-zinc-500">Timezone</div>
                  <input
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    className="mt-2 w-full h-11 rounded-xl bg-zinc-950/40 border border-white/10 px-3 outline-none focus:border-indigo-400/40"
                    placeholder="Asia/Colombo"
                  />
                  <div className="text-xs text-zinc-500 mt-2">Keep default unless needed.</div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-xs text-zinc-500">Hour</div>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={hour}
                    onChange={(e) => setHour(Number(e.target.value))}
                    className="mt-2 w-full h-11 rounded-xl bg-zinc-950/40 border border-white/10 px-3 outline-none focus:border-indigo-400/40"
                  />
                  <div className="text-xs text-zinc-500 mt-2">0–23</div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-xs text-zinc-500">Minute</div>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={minute}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    className="mt-2 w-full h-11 rounded-xl bg-zinc-950/40 border border-white/10 px-3 outline-none focus:border-indigo-400/40"
                  />
                  <div className="text-xs text-zinc-500 mt-2">0–59</div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-indigo-500/10 border border-indigo-400/20 p-4">
                <div>
                  <div className="font-semibold">Preview</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Daily at <span className="text-zinc-200 font-medium">{pad2(hour)}:{pad2(minute)}</span>{" "}
                    ({tz})
                  </div>
                </div>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>

              <div className="text-xs text-zinc-500">
                Note: the worker must be running for emails/check-ins to be sent.
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card title="Next" subtitle="After schedule works">
            <div className="text-sm text-zinc-300 space-y-2">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                Worker service: sends check-ins + emails
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                RAG: grounded advice using guidelines + user history
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                Asgardeo auth: replace dev header with JWT
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
