import Card from "../components/Card";
import Button from "../components/Button";
import { useAppStore } from "../store/useAppStore";

const FEATURES = {
  free: [
    "Mood + habit tracking",
    "Basic insights (limited)",
    "AI chat: 10 messages/day (later)",
    "No voice assistant (later)",
  ],
  trial: [
    "Everything in Free",
    "Full AI chat access (trial)",
    "Voice assistant enabled (trial) (later)",
    "RAG grounded answers (trial) (later)",
  ],
  premium: [
    "Unlimited AI chat (later)",
    "Voice assistant + avatar (later)",
    "RAG + knowledge base (later)",
    "Email weekly summaries",
    "Therapist report export (PDF) (later)",
  ],
};

function PlanCard({
  name,
  price,
  badge,
  active,
  items,
  onSelect,
  primary,
}: {
  name: string;
  price: string;
  badge?: string;
  active: boolean;
  items: string[];
  onSelect: () => void;
  primary?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 shadow-sm",
        primary
          ? "bg-gradient-to-b from-indigo-500/10 to-transparent border-indigo-400/20"
          : "bg-zinc-900/60 border-white/10",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{name}</div>
          <div className="text-zinc-400 text-sm mt-1">{price}</div>
        </div>
        {badge && (
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-200">
            {badge}
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="text-emerald-300">✓</span>
            <span className="text-zinc-300">{x}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {active ? (
          <Button variant="secondary" disabled className="w-full">
            Current plan
          </Button>
        ) : (
          <Button className="w-full" onClick={onSelect}>
            Choose {name}
          </Button>
        )}
      </div>

      <div className="text-xs text-zinc-500 mt-3">
        Payments will be added later (Stripe). This is UI only.
      </div>
    </div>
  );
}

export default function Pricing() {
  const { state, setPlan } = useAppStore();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Pricing</h1>
        <p className="text-zinc-400 mt-1">
          Choose a plan. (For now, changing plans is UI-only.)
        </p>
      </div>

      <Card title="Your current plan" subtitle="Used for feature gating later">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold capitalize">{state.plan}</div>
          <div className="text-sm text-zinc-400">
            Free users will have limits; Premium unlocks all AI features.
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PlanCard
          name="Free"
          price="LKR 0 / month"
          active={state.plan === "free"}
          items={FEATURES.free}
          onSelect={() => setPlan("free")}
        />
        <PlanCard
          name="Trial"
          price="7 days free"
          badge="Most popular"
          primary
          active={state.plan === "trial"}
          items={FEATURES.trial}
          onSelect={() => setPlan("trial")}
        />
        <PlanCard
          name="Premium"
          price="LKR 1,500 / month (example)"
          active={state.plan === "premium"}
          items={FEATURES.premium}
          onSelect={() => setPlan("premium")}
        />
      </div>

      <Card title="How feature gating will work (later)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="font-semibold">Free</div>
            <div className="text-zinc-400 mt-1">
              Limited AI messages/day + no voice assistant.
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="font-semibold">Trial</div>
            <div className="text-zinc-400 mt-1">
              Full AI features temporarily to experience value.
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="font-semibold">Premium</div>
            <div className="text-zinc-400 mt-1">
              Unlimited AI + voice + RAG + reports.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

