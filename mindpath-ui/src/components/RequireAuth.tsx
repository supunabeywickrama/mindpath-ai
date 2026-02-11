import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@asgardeo/auth-react";
import { Loader2 } from "lucide-react";
import { setAccessToken, setUserId, getMe } from "../lib/api";
import type { JSX } from "react/jsx-dev-runtime";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { state, getAccessToken, trySignInSilently } = useAuthContext();
  const [isSynced, setIsSynced] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!state.isAuthenticated && !state.isLoading) {
      trySignInSilently().catch(() => { });
    }
  }, [state.isAuthenticated, state.isLoading, trySignInSilently]);

  useEffect(() => {
    async function sync() {
      if (state.isAuthenticated) {
        try {
          const token = await getAccessToken();
          if (token) {
            setAccessToken(token);
            // Only fetch user ID if not already there, OR always fetch to be safe?
            // Always fetch ensures ID matches token
            const user = await getMe();
            setUserId(user.id);
            setIsSynced(true);
          }
        } catch (e) {
          console.error("Auth Sync Failed", e);
          // If sync fails, we might want to logout or let it fail?
          // For now, let's allow it to proceed if we have a userId, or fail.
          // If we fail to get token, api calls will fail.
        }
      }
    }
    sync();
  }, [state.isAuthenticated, getAccessToken]);

  if (state.isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-indigo-500">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!state.isAuthenticated) {
    // Legacy cleanup: ensure no stale ID login loops
    localStorage.removeItem("mindpath_user_id");
    localStorage.removeItem("mindpath_access_token");
    // Redirect to login, saving the location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for sync to complete before rendering children
  // We MUST have a token for backend requests to work.
  // getUserId() check is not enough because we need the Bearer token now.
  if (!isSynced) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-indigo-500">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin" size={32} />
          <span className="text-xs text-zinc-500">Syncing session...</span>
        </div>
      </div>
    );
  }

  return children;
}
