import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuthContext } from "@asgardeo/auth-react";
import { getMe, type UserProfile, clearAccessToken, clearUserId } from "../lib/api";
import {
  LayoutDashboard,
  SmilePlus,
  CheckSquare,
  BookOpen,
  LineChart,
  MessagesSquare,
  CreditCard,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Mic
} from "lucide-react";

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/mood", label: "Mood Log", icon: SmilePlus },
  { to: "/app/habits", label: "Habits", icon: CheckSquare },
  { to: "/app/journal", label: "Journal", icon: BookOpen },
  { to: "/app/insights", label: "Insights", icon: LineChart },
  { to: "/app/chat", label: "AI Assistant", icon: MessagesSquare },
  { to: "/app/virtual-assistant", label: "Virtual Friend", icon: Mic },
  { to: "/app/pricing", label: "Pricing", icon: CreditCard },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export default function AppShell() {
  const { signOut } = useAuthContext();
  const loc = useLocation();
  const title = nav.find((n) => loc.pathname.startsWith(n.to))?.label ?? "MindPath";

  const [user, setUser] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMe().then(setUser).catch(err => console.error("Failed to fetch user", err));

    // Close menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [loc.pathname]);

  const handleSignOut = () => {
    // Clear local state first to be sure
    clearAccessToken();
    clearUserId();
    // Redirects to Asgardeo logout, then back to VITE_ASGARDEO_SIGN_OUT_REDIRECT_URL
    signOut();
  };

  const border = "rgba(var(--border), 0.10)";
  const panelSolid = "rgba(var(--panel), 0.85)";
  const bgBlur = "rgba(var(--bg), 0.75)";
  const muted = "rgb(var(--muted))";

  return (
    <div
      className="min-h-screen"
      style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))" }}
    >
      <div className="flex">
        {/* Sidebar (Desktop) */}
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
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          {/* Topbar */}
          <header
            className="sticky top-0 z-20 backdrop-blur"
            style={{
              borderBottom: `1px solid ${border}`,
              background: bgBlur,
            }}
          >
            <div className="px-4 md:px-6 py-4 flex items-center justify-between">

              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/5"
                >
                  <Menu size={20} />
                </button>

                <div>
                  <div className="text-lg font-semibold">{title}</div>
                  <div className="text-xs hidden sm:block" style={{ color: muted }}>
                    Welcome back — take it one step at a time.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 relative" ref={menuRef}>
                {/* Avatar */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-semibold transition hover:opacity-80"
                  style={{
                    background: "rgba(var(--primary), 0.18)",
                    border: "1px solid rgba(var(--primary), 0.25)",
                    color: "rgb(var(--primary))",
                    cursor: "pointer",
                  }}
                  title={user?.email || "User"}
                >
                  {user?.email?.[0]?.toUpperCase() || <UserIcon size={16} />}
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                    style={{
                      background: "rgba(30, 30, 35, 0.95)",
                      borderColor: "rgba(255,255,255,0.1)",
                      zIndex: 50,
                    }}
                  >
                    <div className="p-3 border-b border-white/10">
                      <div className="text-sm font-medium truncate text-white">
                        {user?.email || "Guest"}
                      </div>
                      <div className="text-xs text-white/50 truncate mt-0.5">
                        ID: {user?.id || "-"}
                      </div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 md:px-6 py-6 pb-20 md:pb-6">
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

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setMobileNavOpen(false)}
            />

            {/* Drawer */}
            <div
              className="relative w-72 h-full flex flex-col animate-in slide-in-from-left duration-200"
              style={{ background: panelSolid, borderRight: `1px solid ${border}` }}
            >
              <div className="p-6 flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold tracking-tight">MindPath</div>
                  <div className="text-xs mt-1" style={{ color: muted }}>
                    Calm wellness companion
                  </div>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-2 -mr-2 rounded-lg hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-3 pb-6 flex-1 overflow-y-auto">
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
                        onClick={() => setMobileNavOpen(false)} // Close on navigate
                        className={({ isActive }) =>
                          [
                            "flex items-center gap-3 px-3 py-3 rounded-xl border transition",
                            "text-base", // slightly larger for touch
                            isActive ? "bg-white/10" : "hover:bg-white/5",
                          ].join(" ")
                        }
                        style={({ isActive }) => ({
                          borderColor: isActive ? border : "transparent",
                          color: "rgb(var(--text))",
                        })}
                      >
                        <Icon size={20} style={{ color: "rgba(var(--text), 0.85)" }} />
                        <span>{n.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
