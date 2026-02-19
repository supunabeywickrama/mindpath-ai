import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@asgardeo/auth-react";
import { router } from "./app/routes";
import "./index.css";

const raw = localStorage.getItem("mindpath_state_v1");
if (raw) {
  try {
    const parsed = JSON.parse(raw);
    const theme = parsed?.settings?.theme;
    if (theme) document.documentElement.dataset.theme = theme;
  } catch { }
}

// Load Custom Theme
try {
  const customThemeRaw = localStorage.getItem("mindpath_custom_theme");
  if (customThemeRaw) {
    const customTheme = JSON.parse(customThemeRaw);
    if (customTheme.primary) {
      document.documentElement.style.setProperty("--primary", customTheme.primary);
    }
    if (customTheme.base) {
      document.documentElement.style.setProperty("--bg", customTheme.base);
      // Derive panel colors from base (simplified) or let user set them too? 
      // User asked for "2 tones". We can try to smartly derive panel/panel2 or just set them to the same base tone but lighter?
      // For now, let's assume "base" sets the --bg.
      // Ideally we should generate a slightly lighter tone for panel if it's not provided.
      // But let's stick to what's requested: "2 tones".
      // We'll set --bg to the base. 
      // For --panel and --panel2, we might want to calculate them or just use the same base.
      // Let's just set --bg for now, and maybe --panel if we want a "flat" look, 
      // OR we can implement a tiny helper to lighten the color for panels.

      // Actually, let's just use the 'base' for everything for now to see how it looks, 
      // or maybe the user wants to pick both? The UI I added only had "Base Tone".
      // Let's assume Base Tone = --bg.
      // And we leave --panel as default OR try to shift it.

      // Let's try to pass 'panel' as well if saved.
      if (customTheme.panel) {
        document.documentElement.style.setProperty("--panel", customTheme.panel);
        document.documentElement.style.setProperty("--panel2", customTheme.panel); // simplified
      }
    }
  }
} catch (e) {
  console.error("Failed to load custom theme", e);
}

const asgardeoConfig = {
  signInRedirectURL: import.meta.env.VITE_ASGARDEO_SIGN_IN_REDIRECT_URL,
  signOutRedirectURL: import.meta.env.VITE_ASGARDEO_SIGN_OUT_REDIRECT_URL,
  clientID: import.meta.env.VITE_ASGARDEO_CLIENT_ID,
  baseUrl: import.meta.env.VITE_ASGARDEO_BASE_URL,
  scope: ["openid", "profile", "email"],
  storage: "localStorage" as const,
  // System time is 2026, so tokens from 2025 appear expired. 
  // Allow 2 years tolerance (in seconds)
  clockTolerance: 63072000,
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }


  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red" }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  // React.StrictMode causes double-invocation of useEffect in dev, which breaks Asgardeo's code exchange
  // <React.StrictMode>
  <ErrorBoundary>
    <AuthProvider config={asgardeoConfig}>
      <RouterProvider router={router} />
    </AuthProvider>
  </ErrorBoundary>
  // </React.StrictMode>
);
