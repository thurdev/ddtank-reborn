import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@ddtank/ui/fonts";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
