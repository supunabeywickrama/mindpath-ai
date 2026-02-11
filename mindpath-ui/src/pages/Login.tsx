import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuthContext } from "@asgardeo/auth-react";
import { setAccessToken, setUserId, getMe } from "../lib/api";

export default function Login() {
  const nav = useNavigate();
  const { state, signIn, getAccessToken, trySignInSilently } = useAuthContext();

  useEffect(() => {
    // Attempt silent sign-in to restore session if possible
    if (!state.isAuthenticated && !state.isLoading) {
      trySignInSilently().catch(() => { });
    }
  }, [state.isAuthenticated, state.isLoading, trySignInSilently]);

  useEffect(() => {
    async function syncAndRedirect() {
      if (state.isAuthenticated) {
        try {
          const token = await getAccessToken();
          if (token) {
            setAccessToken(token);
            // Fetch user profile from backend to get internal ID
            // Logic: Asgardeo user -> Backend finds/creates -> returns ID
            const user = await getMe();
            setUserId(user.id);
            nav("/app/dashboard", { replace: true });
          }
        } catch (e) {
          console.error("Failed to sync token or fetch profile:", e);
        }
      }
    }
    syncAndRedirect();
  }, [state.isAuthenticated, getAccessToken, nav]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight">Welcome to MindPath</div>
          <div className="text-sm text-zinc-400 mt-1">
            Sign in to continue to your dashboard.
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-8 shadow-sm space-y-6">
          <button
            onClick={() => signIn()}
            className="w-full h-12 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogIn size={20} />
            Sign In with Asgardeo
          </button>

          <p className="text-xs text-zinc-500">
            You will be redirected to the secure login page.
          </p>
        </div>
      </div>
    </div>
  );
}
