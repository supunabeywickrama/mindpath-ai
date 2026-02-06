import { Navigate } from "react-router-dom";
import { getUserId } from "../lib/api";
import type { JSX } from "react/jsx-dev-runtime";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const uid = getUserId();
  if (!uid) return <Navigate to="/login" replace />;
  return children;
}
