import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "katex/dist/katex.min.css";

// Auto-recover from stale chunks when a new deployment occurs
window.addEventListener("vite:preloadError", () => {
  const lastReload = Number(sessionStorage.getItem("pz_chunk_reload") || 0);
  if (Date.now() - lastReload > 8000) {
    sessionStorage.setItem("pz_chunk_reload", String(Date.now()));
    window.location.reload();
  }
});

// Log errors safely in console without injecting blocking fullscreen DOM overlays
window.addEventListener("unhandledrejection", (event) => {
  console.warn("Unhandled promise rejection caught:", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}
