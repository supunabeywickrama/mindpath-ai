import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  SmilePlus,
  CheckSquare,
  BookOpen,
  LineChart,
  MessagesSquare,
  CreditCard,
  Settings,
} from "lucide-react";



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
  const title = nav.find((n) => loc.pathname.startsWith(n.to))?.label ?? "MindPath";

  const border = "rgba(var(--border), 0.10)";
  const panel = "rgba(var(--panel), 0.60)";
  const panelSolid = "rgba(var(--panel), 0.85)";
  const bgBlur = "rgba(var(--bg), 0.75)";
  const muted = "rgb(var(--muted))";

  return (
    <div
      className="min-h-screen"
      style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))" }}
    >
      <div className="flex">
        {/* Sidebar */}
        <aside
          className="hidden md:flex md:w-72 md:flex-col md:sticky md:top-0 md:h-screen backdrop-blur"
          style={{ borderRight: `1px solid ${border}`, background: panelSolid }}
        >
          <div className="p-6">
            <div className="text-xl font-semibold tracking-tight">MindPath</div>
            <div className="text-xs mt-1" style={{ color: muted }}>
              Calm wellness companion
            </div>
          </div>

          <nav className="px-3 pb-6 flex-1">
            <div className="text-xs px-3 mb-2" style={{ color: "rgba(var(--muted), 0.85)" }}>
              MAIN
            </div>

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
                        isActive ? "bg-white/10" : "hover:bg-white/5",
                      ].join(" ")
                    }
                    style={({ isActive }) => ({
                      borderColor: isActive ? border : "transparent",
                      color: "rgb(var(--text))",
                    })}
                  >
                    <Icon size={18} style={{ color: "rgba(var(--text), 0.85)" }} />
                    <span>{n.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="p-4" style={{ borderTop: `1px solid ${border}` }}>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${border}`,
              }}
            >
              <div className="text-sm font-medium">Tip</div>
              <div className="text-xs mt-1" style={{ color: muted }}>
                Keep logs short. Consistency matters more than detail.
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <header
            className="sticky top-0 z-10 backdrop-blur"
            style={{
              borderBottom: `1px solid ${border}`,
              background: bgBlur,
            }}
          >
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{title}</div>
                <div className="text-xs" style={{ color: muted }}>
                  Welcome back — take it one step at a time.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-xl text-sm transition"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${border}`,
                  }}
                >
                  Help
                </button>

                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-semibold"
                  style={{
                    background: "rgba(var(--primary), 0.18)",
                    border: "1px solid rgba(var(--primary), 0.25)",
                  }}
                  title="User"
                >
                  U
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="px-6 py-6">
            <div className="max-w-6xl mx-auto">
              <div
                className="rounded-2xl p-0"
                style={{
                  background: "transparent",
                }}
              >
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
