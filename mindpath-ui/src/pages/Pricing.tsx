import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAppStore } from "../store/useAppStore";
import { getMe, signPayHere, upgradePremium, cancelSubscription, type UserProfile } from "../lib/api";
import { Check, Sparkles, Loader2, Shield } from "lucide-react";

// Helper to submit form programmatically
function submitPayHereForm(data: any) {
  const form = document.createElement("form");
  form.setAttribute("method", "POST");
  form.setAttribute("action", data.action_url);

  // Add all fields
  Object.keys(data).forEach(key => {
    if (key === "action_url") return;
    const hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", data[key]);
    form.appendChild(hiddenField);
  });

  document.body.appendChild(form);
  form.submit();
}

const FEATURES = {
  free: [
    "Mood + habit tracking",
    "Basic insights (limited)",
    "AI chat: 10 messages/day (later)",
    "No voice assistant",
  ],
  trial: [
    "Everything in Free",
    "Full AI chat access",
    "Voice assistant enabled",
    "RAG grounded answers",
  ],
  premium: [
    "Unlimited AI chat",
    "Voice assistant + avatar",
    "RAG + knowledge base",
    "Email weekly summaries",
    "Therapist report export (PDF)",
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
  buttonText,
  loading
}: {
  name: string;
  price: string;
  badge?: string;
  active: boolean;
  items: string[];
  onSelect: () => void;
  primary?: boolean;
  buttonText?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 shadow-sm flex flex-col h-full relative overflow-hidden",
        primary
          ? "bg-gradient-to-b from-indigo-500/10 to-transparent border-indigo-400/20"
          : "bg-zinc-900/60 border-white/10",
        active ? "ring-1 ring-indigo-500/50" : ""
      ].join(" ")}
    >
      {primary && <div className="absolute top-0 right-0 p-3">
        <Sparkles className="text-indigo-400/20" size={64} />
      </div>}

      <div className="flex items-start justify-between relative z-10">
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

      <ul className="mt-6 space-y-3 text-sm text-zinc-300 flex-1 relative z-10">
        {items.map((x) => (
          <li key={x} className="flex gap-3">
            <Check className="text-emerald-400 shrink-0" size={16} />
            <span className="text-zinc-300 leading-snug">{x}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 relative z-10">
        {active ? (
          <Button variant="secondary" disabled className="w-full opacity-75">
            Current plan
          </Button>
        ) : (
          <Button
            className={`w-full ${primary ? "bg-indigo-500 hover:bg-indigo-600" : ""}`}
            onClick={onSelect}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : buttonText || `Choose ${name}`}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadUser();

    // Check for success/cancel params
    if (searchParams.get("success") === "true") {
      alert("Payment successful! Your subscription is active.");
      // Clean URL
      setSearchParams(prev => {
        prev.delete("success");
        return prev;
      });
    }
    if (searchParams.get("canceled") === "true") {
      alert("Payment canceled. You can try again.");
      // Clean URL
      setSearchParams(prev => {
        prev.delete("canceled");
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  async function loadUser() {
    try {
      const u = await getMe();
      setUser(u);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCheckout() {
    // Ask user for Mock vs PayHere
    const useMock = confirm("Use Mock Payment (Instant) instead of PayHere? (Cancel for PayHere)");

    setActionLoading(true);
    try {
      if (useMock) {
        // Mock Flow
        await new Promise(r => setTimeout(r, 1000)); // Fake delay
        const updated = await upgradePremium();
        setUser(updated);
        alert("Mock Payment of LKR 10.00 Successful! You are now Premium.");
      } else {
        // PayHere Flow
        const formData = await signPayHere(period);
        submitPayHereForm(formData);
      }
    } catch (e: any) {
      console.error(e);
      alert("Failed to process payment");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel? You will lose premium features at period end.")) return;
    setActionLoading(true);
    try {
      const updated = await cancelSubscription();
      setUser(updated);
      alert("Subscription cancelled.");
    } catch (e: any) {
      alert(e.message || "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  }

  const plan = user?.subscription_plan || "free";
  const isTrial = user?.is_trial ?? false;
  const isAdmin = user?.is_admin ?? false;

  if (isAdmin) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">Pricing</h1>
        <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 flex items-center gap-4">
          <Shield className="text-indigo-400" size={32} />
          <div>
            <div className="text-lg font-semibold text-indigo-100">Admin Access</div>
            <div className="text-indigo-200/60">You have full access to all features automatically.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="text-center max-w-2xl mx-auto pt-4">
        <h1 className="text-3xl font-semibold">Simple, transparent pricing</h1>
        <p className="text-zinc-400 mt-2 text-lg">
          Start for free, upgrade when you need more power.
        </p>

        {/* Toggle */}
        <div className="inline-flex mt-6 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${period === "monthly" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${period === "yearly" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            Yearly <span className="text-emerald-400 text-[10px] ml-1">-17%</span>
          </button>
        </div>
      </div>

      {/* Current Status Banner */}
      {plan !== "free" && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">
                Current Plan: <span className="capitalize text-indigo-400">{plan}</span>
                {isTrial && " (Trial)"}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {isTrial
                  ? `Trial ends on ${new Date(user?.trial_ends_at!).toLocaleDateString()}`
                  : `Renews on ${new Date(user?.subscription_ends_at!).toLocaleDateString()}`
                }
              </div>
            </div>
            <Button variant="secondary" onClick={handleCancel} disabled={actionLoading}>
              Cancel Plan
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PlanCard
          name="Free"
          price="LKR 0 / month"
          active={plan === "free" && !isTrial}
          items={FEATURES.free}
          onSelect={() => { }}
          buttonText="Your current plan"
        />

        <PlanCard
          name="Trial (Premium)"
          price="7 days free"
          badge="Try it out"
          active={isTrial}
          items={FEATURES.trial}
          onSelect={handleCheckout} // Starts subscription with trial
          buttonText={isTrial ? "Trial Active" : "Start 7-Day Free Trial"}
          loading={actionLoading}
        />
        <PlanCard
          name="Premium"
          price={period === "monthly" ? "LKR 6,000 / month ($20)" : "LKR 30,000 / year ($100)"}
          badge="Best Value"
          primary
          active={plan === "premium" && !isTrial}
          items={FEATURES.premium}
          onSelect={handleCheckout}
          buttonText={plan === "premium" ? "Active" : "Upgrade"}
          loading={actionLoading}
        />
      </div>

      <div className="text-center text-xs text-zinc-500">
        *Actual charge will be $0.03 for testing purposes as requested.
      </div>

      <div className="border-t border-white/10 pt-8 mt-8">
        <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="font-medium text-zinc-200">Can I cancel anytime?</div>
            <div className="text-sm text-zinc-400 mt-1">Yes, you can cancel your subscription at any time via Stripe.</div>
          </div>
          <div>
            <div className="font-medium text-zinc-200">Is the trial really free?</div>
            <div className="text-sm text-zinc-400 mt-1">Yes, you won't be charged for the first 7 days.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
