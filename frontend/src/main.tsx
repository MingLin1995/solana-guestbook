/// <reference types="vite/client" />
import { Buffer } from "buffer";
(window as any).Buffer = Buffer;
(window as any).global = window;
(window as any).process = { env: { NODE_ENV: (import.meta as any).env?.MODE || "development" } };

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
