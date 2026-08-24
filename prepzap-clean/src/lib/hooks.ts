// hooks.ts
import { useEffect, useState } from 'react';
import { runSync } from './syncEngine';

// Tracks browser connectivity. Use this to grey out AITutor/Arena/etc.
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

// Runs a sync on mount and every time the app regains connectivity.
// Mount this once near the app root (e.g. in App.tsx or ToolPageShell).
export function useOfflineSync() {
  const online = useOnlineStatus();

  useEffect(() => {
    runSync(); // on mount — catches "opened app while online" case
  }, []);

  useEffect(() => {
    if (online) runSync(); // on reconnect
  }, [online]);

  return online;
}
