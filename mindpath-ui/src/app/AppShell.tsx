import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, SmilePlus, CheckSquare, BookOpen, LineChart, MessagesSquare, CreditCard, Settings } from "lucide-react";

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/mood", label: "Mood Log", icon: SmilePlus },
  { to: "/app/habits", label: "Habits", icon: CheckSquare },
  { to: "/app/journal", label: "Journal", icon: BookOpen },
  { to: "/app/insights", label: "Insights", icon: LineChart },
  { to: "/app/chat", label: "AI Assistant", icon: MessagesSquare },
  { to: "/app/pricing", label: "Pricing", icon: CreditCard },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export default function AppShell() {
  const loc = useLocation();
  const title = nav.find(n => loc.pathname.startsWith(n.to))?.label ?? "MindPath";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-72 md:flex-col md:sticky md:top-0 md:h-screen border-r border-white/10 bg-zinc-950/80 backdrop-blur">
          <div className="p-6">
            <div className="text-xl font-semibold tracking-tight">MindPath</div>
            <div className="text-xs text-zinc-400 mt-1">Calm wellness companion</div>
          </div>

          <nav className="px-3 pb-6 flex-1">
            <div className="text-xs text-zinc-500 px-3 mb-2">MAIN</div>
            <div className="space-y-1">
              {nav.map((n) => {
                const Icon = n.icon;
                return (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition",
                        "text-sm",
                        isActive
                          ? "bg-white/10 border-white/10"
                          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10",
                      ].join(" ")
                    }
                  >
                    <Icon size={18} className="text-zinc-300" />
                    <span>{n.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="text-sm font-medium">Tip</div>
              <div className="text-xs text-zinc-400 mt-1">
                Keep logs short. Consistency matters more than detail.
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/75 backdrop-blur">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{title}</div>
                <div className="text-xs text-zinc-400">Welcome back — take it one step at a time.</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm">
                  Help
                </button>
                <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center text-sm font-semibold">
                  U
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="px-6 py-6">
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
