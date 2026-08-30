import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.onerror = function(message, source, lineno, colno, error) {
  const errDiv = document.createElement('div');
  errDiv.style.position = 'fixed';
  errDiv.style.inset = '0';
  errDiv.style.background = 'red';
  errDiv.style.color = 'white';
  errDiv.style.zIndex = '999999';
  errDiv.style.padding = '20px';
  errDiv.style.overflow = 'auto';
  errDiv.style.fontSize = '14px';
  errDiv.style.fontFamily = 'monospace';
  errDiv.innerHTML = '<h3>Global Crash</h3>' + 
    '<p>Msg: ' + message + '</p>' + 
    '<p>Line: ' + lineno + ':' + colno + '</p>' + 
    '<pre>' + (error && error.stack ? error.stack : 'No stack') + '</pre>';
  document.body.appendChild(errDiv);
};

window.addEventListener('unhandledrejection', function(event) {
  const errDiv = document.createElement('div');
  errDiv.style.position = 'fixed';
  errDiv.style.inset = '0';
  errDiv.style.background = 'blue';
  errDiv.style.color = 'white';
  errDiv.style.zIndex = '999999';
  errDiv.style.padding = '20px';
  errDiv.style.overflow = 'auto';
  errDiv.style.fontSize = '14px';
  errDiv.style.fontFamily = 'monospace';
  errDiv.innerHTML = '<h3>Unhandled Promise</h3>' + 
    '<pre>' + (event.reason && event.reason.stack ? event.reason.stack : event.reason) + '</pre>';
  document.body.appendChild(errDiv);
});

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
