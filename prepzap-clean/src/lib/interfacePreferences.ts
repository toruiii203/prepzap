import { useSyncExternalStore } from "react";
export type ThemePreference = "system" | "light" | "dark";
export interface InterfacePreferenceValues { theme: ThemePreference; sound: boolean; vibration: boolean; }
const eventName = "studenius:interface-preferences";
export function readInterfacePreferences(): InterfacePreferenceValues {
  try {
    const theme = localStorage.getItem("pz_theme");
    return { theme: theme === "light" || theme === "dark" ? theme : "system", sound: localStorage.getItem("pz_sound_muted") !== "true", vibration: localStorage.getItem("pz_vibration_enabled") === "true" };
  } catch { return { theme: "system", sound: true, vibration: false }; }
}
export function saveInterfacePreferences(values: Partial<InterfacePreferenceValues>) {
  try {
    if (values.theme !== undefined) localStorage.setItem("pz_theme", values.theme);
    if (values.sound !== undefined) localStorage.setItem("pz_sound_muted", String(!values.sound));
    if (values.vibration !== undefined) localStorage.setItem("pz_vibration_enabled", String(values.vibration));
  } catch { /* Private browsing can make persistence unavailable. Feedback remains optional. */ }
  window.dispatchEvent(new Event(eventName));
}
function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(eventName, callback); window.removeEventListener("storage", callback); };
}
function snapshot() { return JSON.stringify(readInterfacePreferences()); }
export function useInterfacePreferences(): InterfacePreferenceValues {
  return JSON.parse(useSyncExternalStore(subscribe, snapshot, () => '{"theme":"system","sound":true,"vibration":false}')) as InterfacePreferenceValues;
}
export function vibrationEnabled() {
  return readInterfacePreferences().vibration && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
