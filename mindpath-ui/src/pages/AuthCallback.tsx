import { useEffect, useState } from "react";
import { useAuthContext } from "@asgardeo/auth-react";
import { useNavigate } from "react-router-dom";
import { setAccessToken, setUserId, getMe } from "../lib/api";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const { state, getAccessToken } = useAuthContext();
  const nav = useNavigate();
  const [status, setStatus] = useState("Verifying authentication...");

  useEffect(() => {
    async function sync() {
      if (state.isLoading) return;

      if (state.isAuthenticated) {
        try {
          setStatus("Syncing session...");
          const token = await getAccessToken();
          if (token) {
            setAccessToken(token);
            // Fetch internal user ID
            const user = await getMe();
            setUserId(user.id);
            // Redirect
            nav("/app/dashboard", { replace: true });
          } else {
            setStatus("No access token available.");
          }
        } catch (e) {
          console.error("Callback sync failed", e);
          setStatus("Failed to sync session.");
        }
      } else {
        // If we land here but aren't authenticated, maybe redirect to login?
        // Or we are just waiting?
        setStatus("Waiting for authentication...");
        // If it takes too long, user might be stuck. 
        // But Asgardeo SDK should handle the code exchange.
      }
    }
    sync();
  }, [state.isAuthenticated, state.isLoading, getAccessToken, nav]);

  return (
    <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-200">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <div className="text-sm text-zinc-400">{status}</div>
      </div>
    </div>
  );
}
