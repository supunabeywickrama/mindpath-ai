import { useEffect, useState, useRef } from "react";
import { useAuthContext } from "@asgardeo/auth-react";
import { useNavigate, useLocation } from "react-router-dom";
import { setAccessToken, setUserId, getMe } from "../lib/api";
import { Loader2, AlertCircle } from "lucide-react";

export default function AuthCallback() {
  const { state, getAccessToken, signIn } = useAuthContext();
  const nav = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("Verifying authentication...");
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const code = new URLSearchParams(location.search).get("code");
    console.log("AuthCallback mounted. Code:", code ? "Present" : "Missing", "State:", state);

    if (!code && !state.isAuthenticated && !state.isLoading) {
      setError("No authentication code found.");
      setStatus("Authentication failed.");
    }
  }, [location.search, state]);

  useEffect(() => {
    console.log("AuthCallback state update:", state);

    async function sync() {
      if (state.isLoading) {
        setStatus("Authenticating with provider...");
        return;
      }

      if (state.isAuthenticated) {
        try {
          setStatus("Syncing session...");
          const token = await getAccessToken();
          if (token) {
            console.log("Access token obtained.");
            setAccessToken(token);
            // Fetch internal user ID
            const user = await getMe();
            console.log("User fetched:", user);
            setUserId(user.id);
            // Redirect
            nav("/app/dashboard", { replace: true });
          } else {
            console.error("No access token available despite being authenticated.");
            setStatus("No access token available.");
            setError("Failed to retrieve access token.");
          }
        } catch (e) {
          console.error("Callback sync failed", e);
          setStatus("Failed to sync session.");
          setError("Session sync failed. Please try logging in again.");
        }
      } else {
        // If we have a code but aren't authenticated yet, and not loading...
        const code = new URLSearchParams(location.search).get("code");
        if (code && !state.isLoading) {
          console.warn("Has code but not authenticated and not loading. Verify Provider config.");
          setStatus("Authentication processing seems stuck...");
          // Optional: Try to manually trigger sign in or just wait?
          // The SDK should handle this. If it fails, it might be strict mode double-invoke issue.
        } else if (!code) {
          setStatus("Waiting for authentication details...");
        }
      }
    }
    sync();

    // Timeout fallback if stuck for too long
    const timer = setTimeout(() => {
      if (!state.isAuthenticated && !state.isLoading) {
        setError("Authentication timed out or failed.");
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [state.isAuthenticated, state.isLoading, getAccessToken, nav, location.search]);

  const handleRetry = () => {
    signIn();
  };

  return (
    <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-200">
      <div className="flex flex-col items-center gap-4 text-center">
        {error ? (
          <>
            <AlertCircle className="text-red-500" size={48} />
            <div className="text-xl font-semibold text-red-400">Authentication Error</div>
            <div className="text-zinc-400 max-w-md">{error}</div>
            <div className="text-xs text-zinc-600 mt-2">Status: {status}</div>
            <button
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white transition-colors"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <div className="text-sm text-zinc-400">{status}</div>
            <div className="text-xs text-zinc-600 mt-2 max-w-xs break-all">
              {state.isLoading ? "Loading..." : "Waiting..."}
            </div>
            <div className="mt-8 p-4 bg-zinc-900 rounded text-left text-xs font-mono text-zinc-500 w-full max-w-lg overflow-auto">
              <p className="font-bold text-zinc-400 mb-2">Debug Info:</p>
              <pre>{JSON.stringify(state, null, 2)}</pre>
              <p className="mt-2">URL Code: {new URLSearchParams(location.search).get("code") ? "Present" : "Missing"}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
