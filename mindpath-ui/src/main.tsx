import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import "./index.css";

const theme = JSON.parse(localStorage.getItem("mindpath_state_v1") || "{}")?.settings?.theme;
if (theme) document.documentElement.dataset.theme = theme;

const raw = localStorage.getItem("mindpath_state_v1");
if (raw) {
  try {
    const parsed = JSON.parse(raw);
    const theme = parsed?.settings?.theme;
    if (theme) document.documentElement.dataset.theme = theme;
  } catch {}
}


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
