import { createBrowserRouter } from "react-router-dom";
import AppShell from "./AppShell";
import Landing from "../pages/Landing";
import Dashboard from "../pages/Dashboard";
import MoodLog from "../pages/MoodLog";
import Habits from "../pages/Habits";
import Journal from "../pages/Journal";
import Insights from "../pages/Insights";
import Chat from "../pages/Chat";
import Pricing from "../pages/Pricing";
import Settings from "../pages/Settings";
import Login from "../pages/Login";
import Register from "../pages/Register";
import RequireAuth from "../components/RequireAuth";
import AuthCallback from "../pages/AuthCallback";
import RouteError from "../pages/RouteError";
import VirtualAssistant from "../pages/VirtualAssistant";




export const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/login", element: <Login />, errorElement: <RouteError /> },
  { path: "/register", element: <Register />, errorElement: <RouteError /> },
  { path: "/callback", element: <AuthCallback />, errorElement: <RouteError /> },
  {
    path: "/app",
    element: (<RequireAuth>
      <AppShell />
    </RequireAuth>
    ),
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "mood", element: <MoodLog /> },
      { path: "habits", element: <Habits /> },
      { path: "journal", element: <Journal /> },
      { path: "insights", element: <Insights /> },
      { path: "chat", element: <Chat /> },
      { path: "pricing", element: <Pricing /> },
      { path: "settings", element: <Settings /> },
      { path: "virtual-assistant", element: <VirtualAssistant /> },
    ],
  },
]);
