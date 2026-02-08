import { useEffect, useState } from "react";
import { useAuthContext } from "@asgardeo/auth-react";
import { useNavigate } from "react-router-dom";
import { devLogin, setUserId } from "../lib/api";

export default function AuthCallback() {
  const { state, signIn, getBasicUserInfo } = useAuthContext();
  const nav = useNavigate();
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    (async () => {
      if (state.isLoading) {
        setStatus("Verifying authentication...");
        return;
      }

      if (state.isAuthenticated) {
        try {
          console.log("AuthCallback: Authenticated", state);
          setStatus("Getting user info...");
          const info = await getBasicUserInfo();
          console.log("AuthCallback: User info", info);

          if (info.email) {
            setStatus("Syncing with backend...");
            const user = await devLogin(info.email);
            console.log("AuthCallback: Backend user", user);
            setUserId(user.id);
          }

          console.log("AuthCallback: Redirecting...");
          setStatus("Redirecting...");
          nav("/app/dashboard", { replace: true });
        } catch (e) {
          console.error("Auth callback failed", e);
          setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        setStatus("Waiting for authentication...");
        console.log("AuthCallback: Waiting...", state);
      }
    })();
  }, [state.isAuthenticated, state.isLoading, getBasicUserInfo, nav, state]);

  return (
    <div className="min-h-screen grid place-items-center text-zinc-200">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <div>{status}</div>
      </div>
    </div>
  );
}
