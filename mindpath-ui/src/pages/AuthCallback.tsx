import { useEffect } from "react";
import { useAuthContext } from "@asgardeo/auth-react";
import { useNavigate } from "react-router-dom";
import { devLogin, setUserId } from "../lib/api";

export default function AuthCallback() {
  const { signIn, getBasicUserInfo } = useAuthContext();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        await signIn();

        // Exchange or ensure backend user exists
        const info = await getBasicUserInfo();
        if (info.email) {
          // In a real app, we'd exchange the token. For now, we trust the email
          // and use the existing devLogin endpoint to get/create a user ID.
          const user = await devLogin(info.email);
          setUserId(user.id);
        }
      } catch (e) {
        console.error("Auth callback failed", e);
      }

      nav("/app/dashboard", { replace: true });
    })();
  }, [signIn, getBasicUserInfo, nav]);

  return (
    <div className="min-h-screen grid place-items-center text-zinc-200">
      Signing in…
    </div>
  );
}
