import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "katex/dist/katex.min.css";

// Log errors safely in console without injecting blocking fullscreen DOM overlays
window.addEventListener('unhandledrejection', (event) => {
  console.warn("Unhandled promise rejection caught:", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
