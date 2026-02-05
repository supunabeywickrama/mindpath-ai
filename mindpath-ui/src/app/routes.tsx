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

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },

  {
    path: "/app",
    element: <AppShell />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "mood", element: <MoodLog /> },
      { path: "habits", element: <Habits /> },
      { path: "journal", element: <Journal /> },
      { path: "insights", element: <Insights /> },
      { path: "chat", element: <Chat /> },
      { path: "pricing", element: <Pricing /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);
